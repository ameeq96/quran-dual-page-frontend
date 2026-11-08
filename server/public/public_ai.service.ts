import * as http from 'http';
import * as https from 'https';
import { Repository } from 'typeorm';
import { MemoryCacheService } from '../common/cache/memory-cache.service.js';
import { AppSetting } from '../entities/app_setting.entity.js';
import { HttpError } from '../errors.js';

type AdminAiRunRequest = {
  tool: string;
  toolTitle: string;
  toolInstruction: string;
  userInput: string;
  responseLanguage: string;
  responseDepth: string;
  contextPromptBlock: string;
};

type NormalizedProvider = 'local' | 'ollama' | 'openai' | 'custom';
const OLLAMA_MODEL = 'qwen3:0.6b';

type RuntimeConfig = {
  provider: NormalizedProvider;
  providerLabel: string;
  model: string;
  endpoint: string;
  secret: string;
  statusLabel: string;
  systemPrompt: string;
  customHeaders: Record<string, string>;
};

const HTTP_KEEP_ALIVE_AGENT = new http.Agent({
  keepAlive: true,
  maxSockets: 32,
});

const HTTPS_KEEP_ALIVE_AGENT = new https.Agent({
  keepAlive: true,
  maxSockets: 32,
});

export class PublicAiService {
  private generating = false;

  constructor(
    private readonly settingsRepo: Repository<AppSetting>,
    private readonly cache: MemoryCacheService,
  ) {}

  async runTool(request: AdminAiRunRequest) {
    if (!request.tool?.trim()) {
      throw new HttpError(400, 'tool is required');
    }

    const verifiedSearch = request.tool === 'smartSearch' &&
      request.toolInstruction?.startsWith('SEARCH_VERIFIED_KEYS_V1') === true;
    const config = await this.loadRuntimeConfig();
    const systemPrompt = [
      'You are an AI assistant inside a Quran study app.',
      'Use only the provided Quran page context and request details.',
      'Do not invent unsupported tafsir, fiqh rulings, or historical claims.',
      'If the available page context is limited, state that clearly.',
      'Context may be a Surah-level excerpt, not verified alignment to the scanned page or its printed lines.',
      'Never claim to hear a recording or assess pronunciation, makharij, or acoustic Tajweed from text.',
      'Do not invent an Ayah reference, scan position, or accuracy score. Explain when the supplied evidence is insufficient.',
      'Do not regenerate Arabic Quran quotations. Refer to verified Ayah keys and the original Quran text displayed by the app.',
      'Keep answers structured, concise, and practical.',
      config.systemPrompt,
      ...(verifiedSearch ? [
        'Rank only the supplied verified Ayah keys for the query. Return a JSON object containing only a matches array of supplied keys, with at least one key when candidates exist. Return no facts, explanations, quotations, or new references.',
      ] : []),
    ]
      .filter((entry) => entry.trim().length > 0)
      .join('\n');

    const trimmedInstruction = request.toolInstruction?.trim() ?? '';
    const trimmedUserInput = request.userInput?.trim() ?? '';
    const trimmedContext = request.contextPromptBlock?.trim() ?? '';
    if (trimmedContext.length > 8000 || trimmedUserInput.length > 4000 ||
        trimmedInstruction.length > 1000 || systemPrompt.length > 4000) {
      throw new HttpError(413, 'The AI request is too long. Use a shorter question and a smaller verified context.');
    }
    const candidateKeys = verifiedSearch ? [...new Set(
      [...trimmedContext.replace(/\r\n/g, '\n').matchAll(/^Verse key:\s*(\d{1,3}:\d{1,3})$/gm)]
        .map((match) => match[1]),
    )].slice(0, 3) : [];
    const responseFormat = verifiedSearch ? {
      type: 'object',
      properties: {
        matches: {
          type: 'array',
          items: candidateKeys.length > 0
            ? { type: 'string', enum: candidateKeys }
            : { type: 'string' },
          minItems: candidateKeys.length > 0 ? 1 : 0,
          maxItems: candidateKeys.length,
          uniqueItems: true,
        },
      },
      required: ['matches'],
      additionalProperties: false,
    } : undefined;

    const userPrompt = [
      `Tool: ${request.toolTitle?.trim() || request.tool}`,
      `Instruction: ${trimmedInstruction || 'Help with the current Quran page.'}`,
      `Response language: ${request.responseLanguage?.trim() || 'english'}`,
      `Response depth: ${request.responseDepth?.trim() || 'fast'}`,
      trimmedUserInput.length === 0
        ? verifiedSearch
          ? 'User request: Rank the supplied verified Ayah results.'
          : 'User request: Focus on the current page only.'
        : `User request: ${trimmedUserInput}`,
      '',
      trimmedContext,
      ...(verifiedSearch ? [
        `Allowed Ayah keys: ${JSON.stringify(candidateKeys)}. Rank these verified results for the query and return only {"matches":[...]}. ${candidateKeys.length > 0 ? 'Select at least one supplied key.' : 'No candidates exist; matches must be empty.'}`,
      ] : []),
    ]
      .filter((entry) => entry.trim().length > 0)
      .join('\n');

    if (this.generating) {
      throw new HttpError(503, 'Ollama is busy. Wait for the current answer and try again.');
    }
    this.generating = true;
    let output: string;
    try {
      output = await this.runProvider(config, systemPrompt, userPrompt, responseFormat);
    } catch (_) {
      throw new HttpError(503, 'Ollama qwen3:0.6b is unavailable. Please try again.');
    } finally {
      this.generating = false;
    }
    if (!output.trim()) {
      throw new HttpError(503, 'Ollama qwen3:0.6b returned no answer. Please try again.');
    }
    if (verifiedSearch) {
      let matches: unknown;
      try {
        const result = JSON.parse(output) as Record<string, unknown>;
        if (!result || typeof result !== 'object' || Array.isArray(result) ||
            Object.keys(result).length !== 1 || !Object.prototype.hasOwnProperty.call(result, 'matches')) {
          throw new Error('Invalid verified search response.');
        }
        matches = result.matches;
      } catch (_) {
        throw new HttpError(503, 'Ollama returned an invalid verified search result. Please try again.');
      }
      if (!Array.isArray(matches) || matches.length > candidateKeys.length ||
          (candidateKeys.length > 0 && matches.length === 0) ||
          new Set(matches).size !== matches.length ||
          matches.some((key: unknown) => typeof key !== 'string' || !candidateKeys.includes(key))) {
        throw new HttpError(503, 'Ollama returned an invalid verified search result. Please try again.');
      }
      output = JSON.stringify({ matches });
    }
    this.verifyMarkedArabicQuotations(output, trimmedContext);

    return {
      configured: true,
      output: output.trim(),
      sourceLabel: `${config.providerLabel} ${config.model}`.trim(),
      provider: config.provider,
      providerLabel: config.providerLabel,
      model: config.model,
      endpoint: config.endpoint,
      statusLabel: config.statusLabel,
      usedOnlineModel: true,
    };
  }

  private async runProvider(
    config: RuntimeConfig,
    systemPrompt: string,
    userPrompt: string,
    responseFormat?: Record<string, unknown>,
  ): Promise<string> {
    return this.runOllama(config, systemPrompt, userPrompt, responseFormat);
  }

  private async runOllama(
    config: RuntimeConfig,
    systemPrompt: string,
    userPrompt: string,
    responseFormat?: Record<string, unknown>,
  ): Promise<string> {
    const endpoint = this.normalizeBaseUrl(
      config.endpoint || 'http://127.0.0.1:11434',
    );
    const payload = {
      model: OLLAMA_MODEL,
      system: systemPrompt,
      prompt: userPrompt,
      stream: false,
      think: false,
      truncate: false,
      keep_alive: '2m',
      ...(responseFormat ? { format: responseFormat } : {}),
      options: { num_ctx: 4096, num_predict: responseFormat ? 96 : 384, num_thread: 1 },
    };

    const response = await this.postJson(`${endpoint}/api/generate`, payload, {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...config.customHeaders,
    });

    if (!response.body || typeof response.body !== 'object' || Array.isArray(response.body)) {
      throw new HttpError(503, 'Ollama returned an invalid response.');
    }
    const result = response.body as Record<string, unknown>;
    if (result.model !== OLLAMA_MODEL || result.done !== true || typeof result.response !== 'string') {
      throw new HttpError(503, 'Ollama returned an invalid model response.');
    }
    return result.response;
  }

  private async runOpenAi(
    config: RuntimeConfig,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    if (!config.secret.trim()) {
      throw new HttpError(400, 'ai_secret is required for OpenAI provider.');
    }

    const endpoint =
      config.endpoint.trim().length === 0
        ? 'https://api.openai.com/v1/responses'
        : config.endpoint.trim();

    const payload = {
      model: config.model || 'gpt-4o-mini',
      instructions: systemPrompt,
      input: userPrompt,
    };

    const response = await this.postJson(endpoint, payload, {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${config.secret}`,
      ...config.customHeaders,
    });

    return this.extractGeneratedText(response.body);
  }

  private async runCustom(
    config: RuntimeConfig,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    if (!config.endpoint.trim()) {
      throw new HttpError(400, 'ai_endpoint is required for custom provider.');
    }

    const payload = {
      model: config.model,
      system: systemPrompt,
      prompt: userPrompt,
      input: userPrompt,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...config.customHeaders,
    };
    if (config.secret.trim().length > 0) {
      headers.Authorization = `Bearer ${config.secret}`;
    }

    const response = await this.postJson(config.endpoint.trim(), payload, headers);
    return this.extractGeneratedText(response.body);
  }

  private async loadRuntimeConfig(): Promise<RuntimeConfig> {
    return this.cache.getOrSet('public-ai:runtime-config', 15_000, async () => {
      const settings = await this.settingsRepo.find();
      const values = new Map(settings.map((entry) => [entry.key, entry.value]));
      return {
        provider: 'ollama',
        providerLabel: 'Ollama',
        model: OLLAMA_MODEL,
        endpoint: 'http://127.0.0.1:11434',
        secret: '',
        statusLabel: 'Ollama qwen3:0.6b',
        systemPrompt: (values.get('ai_system_prompt') ?? '').trim(),
        customHeaders: {},
      };
    });
  }

  private normalizeProvider(rawProvider: string): NormalizedProvider {
    switch (rawProvider.trim().toLowerCase()) {
      case 'ollama':
        return 'ollama';
      case 'openai':
      case 'chatgpt':
        return 'openai';
      case 'custom':
        return 'custom';
      default:
        return 'local';
    }
  }

  private providerLabel(
    provider: NormalizedProvider,
    rawProvider: string,
  ): string {
    const normalized = rawProvider.trim().toLowerCase();
    if (normalized.length > 0) {
      switch (normalized) {
        case 'ollama':
          return 'Ollama';
        case 'openai':
        case 'chatgpt':
          return 'ChatGPT';
        case 'custom':
          return 'Custom AI';
        default:
          return rawProvider.trim();
      }
    }

    switch (provider) {
      case 'ollama':
        return 'Ollama';
      case 'openai':
        return 'ChatGPT';
      case 'custom':
        return 'Custom AI';
      case 'local':
      default:
        return 'Local assistant';
    }
  }

  private normalizeBaseUrl(value: string): string {
    const trimmed = value.trim();
    if (trimmed.endsWith('/')) {
      return trimmed.slice(0, -1);
    }
    return trimmed;
  }

  private verifyMarkedArabicQuotations(output: string, context: string): void {
    const markedArabic = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0898-\u089F\u08CA-\u08FF]/u;
    if (!markedArabic.test(output.normalize('NFKC'))) return;
    const baseWords = (value: string) => value.normalize('NFKC')
      .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0898-\u089F\u08CA-\u08FF]|\p{M}/gu, '')
      .replace(/[\u0640\u200C-\u200F\u202A-\u202E\u2066-\u2069]/gu, '')
      .replace(/[\p{P}\p{S}\p{N}]/gu, ' ')
      .replace(/\s+/gu, ' ').trim();
    const verifiedContext = ` ${baseWords(context)} `;
    const phrases = output.normalize('NFKC').match(
      /[\p{Script_Extensions=Arabic}\u200C-\u200F]+(?:\s+[\p{Script_Extensions=Arabic}\u200C-\u200F]+)*/gu,
    ) ?? [];
    for (const phrase of phrases) {
      if (!markedArabic.test(phrase)) continue;
      const quotation = baseWords(phrase);
      if (!quotation || !verifiedContext.includes(` ${quotation} `)) {
        throw new HttpError(503, 'Ollama returned an unverified Arabic quotation. Please read the original Quran text and try again.');
      }
    }
  }

  private parseCustomHeaders(rawValue: string): Record<string, string> {
    if (rawValue.trim().length === 0) {
      return {};
    }

    try {
      const decoded = JSON.parse(rawValue) as unknown;
      if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
        return {};
      }

      const record = decoded as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(record).map(([key, value]) => [key, String(value)]),
      );
    } catch {
      return {};
    }
  }

  private async postJson(
    urlString: string,
    body: Record<string, unknown>,
    headers: Record<string, string>,
  ): Promise<{ statusCode: number; body: unknown }> {
    const url = new URL(urlString);
    const client = url.protocol === 'https:' ? https : http;
    const payload = JSON.stringify(body);

    return new Promise((resolve, reject) => {
      const request = client.request(
        url,
        {
          method: 'POST',
          agent:
            url.protocol === 'https:' ? HTTPS_KEEP_ALIVE_AGENT : HTTP_KEEP_ALIVE_AGENT,
          headers: {
            ...headers,
            'Content-Length': Buffer.byteLength(payload).toString(),
          },
        },
        (response) => {
          const chunks: Buffer[] = [];
          let receivedBytes = 0;

          response.on('data', (chunk: Buffer | string) => {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            receivedBytes += buffer.length;
            if (receivedBytes > 65536) {
              response.destroy(new Error('Ollama response exceeded its limit.'));
              request.destroy();
              reject(new HttpError(503, 'Ollama returned an oversized response.'));
              return;
            }
            chunks.push(buffer);
          });
          response.on('error', reject);
          response.on('aborted', () => reject(new HttpError(503, 'Ollama response was interrupted.')));

          response.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf8');
            const parsed = this.safeJsonParse(text);
            const statusCode = response.statusCode ?? 500;

            if (statusCode < 200 || statusCode >= 300) {
              reject(
                new HttpError(
                  400,
                  `AI provider request failed with status ${statusCode}.`,
                ),
              );
              return;
            }

            resolve({ statusCode, body: parsed });
          });
        },
      );

      request.on('error', (error) => reject(error));
      const deadline = setTimeout(() => {
        request.destroy(new Error('Ollama request timed out.'));
      }, 90000);
      request.once('close', () => clearTimeout(deadline));
      request.setTimeout(90000, () => {
        request.destroy(new Error('Ollama request timed out.'));
      });
      request.write(payload);
      request.end();
    });
  }

  private safeJsonParse(value: string): unknown {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }

  private extractGeneratedText(body: unknown): string {
    if (typeof body === 'string') {
      return body;
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return '';
    }

    const record = body as Record<string, unknown>;

    if (typeof record.response === 'string') {
      return record.response;
    }
    if (typeof record.output_text === 'string') {
      return record.output_text;
    }
    if (typeof record.text === 'string') {
      return record.text;
    }

    const choices = Array.isArray(record.choices) ? record.choices : [];
    for (const choice of choices) {
      if (!choice || typeof choice !== 'object' || Array.isArray(choice)) {
        continue;
      }

      const choiceRecord = choice as Record<string, unknown>;
      const message = choiceRecord.message;
      if (message && typeof message === 'object' && !Array.isArray(message)) {
        const messageRecord = message as Record<string, unknown>;
        const content = messageRecord.content;

        if (typeof content === 'string') {
          return content;
        }

        if (Array.isArray(content)) {
          const contentText = content
            .filter(
              (item): item is Record<string, unknown> =>
                !!item && typeof item === 'object' && !Array.isArray(item),
            )
            .map((item) => (typeof item.text === 'string' ? item.text : ''))
            .filter((text) => text.length > 0)
            .join('\n')
            .trim();

          if (contentText.length > 0) {
            return contentText;
          }
        }
      }

      if (typeof choiceRecord.text === 'string') {
        return choiceRecord.text;
      }
    }

    const output = Array.isArray(record.output) ? record.output : [];
    const outputTextParts: string[] = [];

    for (const item of output) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        continue;
      }

      const itemRecord = item as Record<string, unknown>;
      const content = Array.isArray(itemRecord.content) ? itemRecord.content : [];

      for (const contentItem of content) {
        if (
          !contentItem ||
          typeof contentItem !== 'object' ||
          Array.isArray(contentItem)
        ) {
          continue;
        }

        const contentRecord = contentItem as Record<string, unknown>;
        if (typeof contentRecord.text === 'string') {
          outputTextParts.push(contentRecord.text);
        }
      }
    }

    return outputTextParts.join('\n').trim();
  }
}

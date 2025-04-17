#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosResponse } from "axios";
import { resolve, dirname } from "path";
import { existsSync, readdirSync, readFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { exec } from "child_process";
import { promisify } from "util";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// Асинхронный exec
const execAsync = promisify(exec);

// Парсим аргументы командной строки
const argv = yargs(hideBin(process.argv))
  .option("api-key", {
    type: "string",
    description: "OpenRouter API Key",
    alias: "k",
    demandOption: true, // Делаем параметр обязательным
  })
  .option("default-model", {
    type: "string",
    description: "Default model to use",
    alias: "m",
    default: "google/gemini-2.0-flash-thinking-exp:free", // Устанавливаем значение по умолчанию
  })
  .parseSync();

// Интерфейсы для типизации
interface LanguageConfig {
  synonyms: string[];
  rootDirs: string[];
  markerFiles: string[];
}

interface LanguageRoots {
  [key: string]: LanguageConfig;
}

interface AskToolArgs {
  prompt: string;
  model?: string;
}

interface CodeReviewToolArgs {
  completed_tasks: string[];
  work_report: string;
  project_path: string;
  planned_tasks: string[];
  language: string;
  model?: string;
}

interface ToolResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

// Параметры
const openRouterApiKey: string = argv.apiKey;
const openRouterApiUrl: string = "https://openrouter.ai/api/v1/chat/completions";
const defaultModel: string = argv.defaultModel;

// Логирование значений для диагностики
console.error(`OPENROUTER_API_KEY provided: ${openRouterApiKey ? "Yes" : "No"}`);
console.error(`DEFAULT_MODEL: ${defaultModel}`);

// Словарь языков
const languageRoots: LanguageRoots = {
  js: {
    synonyms: ["javascript", "nodejs", "ts", "typescript", "node"],
    rootDirs: ["src", "app", "lib", "server", "client", "frontend", "backend"],
    markerFiles: ["package.json", "tsconfig.json"],
  },
  python: {
    synonyms: ["py", "python3"],
    rootDirs: ["src", "app", "scripts", "lib", "project"],
    markerFiles: ["pyproject.toml", "requirements.txt", "setup.py"],
  },
  csharp: {
    synonyms: ["c#", "cs"],
    rootDirs: ["src", "app", "lib", "Program", "Solution"],
    markerFiles: ["*.csproj", "sln"],
  },
  php: {
    synonyms: ["php"],
    rootDirs: ["src", "app", "public", "web", "includes"],
    markerFiles: ["composer.json", "index.php"],
  },
  java: {
    synonyms: ["java"],
    rootDirs: ["src/main/java", "src", "app", "java"],
    markerFiles: ["pom.xml", "build.gradle"],
  },
  ruby: {
    synonyms: ["rb", "ruby"],
    rootDirs: ["app", "lib", "src", "rails"],
    markerFiles: ["Gemfile", "config.ru"],
  },
  go: {
    synonyms: ["golang", "go"],
    rootDirs: ["cmd", "pkg", "src", "app"],
    markerFiles: ["go.mod", "main.go"],
  },
  rust: {
    synonyms: ["rs", "rust"],
    rootDirs: ["src", "lib", "app"],
    markerFiles: ["Cargo.toml"],
  },
  cpp: {
    synonyms: ["c++", "cpp", "cxx"],
    rootDirs: ["src", "include", "lib", "app"],
    markerFiles: ["CMakeLists.txt", "Makefile"],
  },
  swift: {
    synonyms: ["swift"],
    rootDirs: ["Sources", "src", "app"],
    markerFiles: ["Package.swift", "*.xcodeproj"],
  },
};

// Определяем инструменты
const TOOLS: Tool[] = [
  {
    name: "ask",
    description: "Send a text prompt to OpenRouter API with a specified model",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The input prompt for text generation",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "code_review",
    description: "Perform code review using OpenRouter API with project context",
    inputSchema: {
      type: "object",
      properties: {
        completed_tasks: {
          type: "array",
          items: { type: "string" },
          description: "List of completed tasks",
        },
        work_report: {
          type: "string",
          description: "Report of performed work with action log",
        },
        project_path: {
          type: "string",
          description: "Absolute path to the project's working directory",
        },
        planned_tasks: {
          type: "array",
          items: { type: "string" },
          description: "List of planned tasks",
        },
        language: {
          type: "string",
          description:
            "Primary language of the project (e.g., js, python, csharp, php, java, ruby, go, rust, cpp, swift)",
        },
      },
      required: ["completed_tasks", "work_report", "project_path", "planned_tasks", "language"],
    },
  },
];

// Класс сервера
class OpenRouterServer {
  // Функция для нормализации языка
  normalizeLanguage(lang: string): string {
    const lowerLang = lang.toLowerCase();
    for (const [key, { synonyms }] of Object.entries(languageRoots)) {
      if (lowerLang === key || synonyms.includes(lowerLang)) {
        return key;
      }
    }
    return lowerLang;
  }

  // Проверка маркерных файлов
  hasMarkerFile(dir: string, markerFiles: string[]): boolean {
    for (const marker of markerFiles) {
      if (marker.includes("*")) {
        const files = readdirSync(dir).filter((f) => f.match(marker.replace("*", ".*")));
        if (files.length > 0) return true;
      } else {
        const markerPath = resolve(dir, marker);
        if (existsSync(markerPath)) return true;
      }
    }
    return false;
  }

  // Поиск корня проекта
  getProjectRoot(projectPath: string, language: string): string {
    const normalizedLang = this.normalizeLanguage(language);
    const langConfig = languageRoots[normalizedLang] || { rootDirs: ["src", "app"], markerFiles: [] };
    const { rootDirs, markerFiles } = langConfig;

    let currentPath = resolve(projectPath);

    if (!existsSync(currentPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    while (currentPath !== dirname(currentPath)) {
      if (markerFiles.length && this.hasMarkerFile(currentPath, markerFiles)) {
        return currentPath;
      }
      for (const dir of rootDirs) {
        const testPath = resolve(currentPath, dir);
        if (existsSync(testPath)) {
          return currentPath;
        }
      }
      currentPath = dirname(currentPath);
    }

    return projectPath;
  }

  // Вызов repomix через CLI
  async runRepomix(projectRoot: string): Promise<string> {
    const outputPath = resolve(tmpdir(), `repomix-output-${Date.now()}.txt`);
    const command = `npx repomix --output "${outputPath}" --ignore "node_modules,dist,build,.git" --style plain --compress "${projectRoot}"`;

    console.error(`Running repomix CLI: ${command}`);
    try {
      // Проверяем существование директории
      if (!existsSync(projectRoot)) {
        throw new Error(`Project root does not exist: ${projectRoot}`);
      }

      // Выполняем команду асинхронно
      await execAsync(command);

      // Проверяем, создан ли выходной файл
      if (!existsSync(outputPath)) {
        throw new Error("Repomix output file was not created");
      }

      // Читаем результат
      console.error(`Reading repomix output from ${outputPath}`);
      const codeBase = readFileSync(outputPath, "utf8");

      return codeBase;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Repomix CLI error: ${message}`);
      throw new Error(`Failed to run repomix: ${message}`);
    } finally {
      // Очищаем временный файл
      if (existsSync(outputPath)) {
        try {
          console.error(`Cleaning up ${outputPath}`);
          unlinkSync(outputPath);
        } catch (cleanupError) {
          console.error("Failed to clean up repomix output:", cleanupError);
        }
      }
    }
  }

  // Обработка инструментов
  async callTool(params: {
    name: string;
    arguments?: Record<string, unknown>;
  }): Promise<ToolResponse> {
    const { name, arguments: args = {} } = params;

    console.error(`Processing tool: ${name} with arguments: ${JSON.stringify(args)}`);

    if (!["ask", "code_review"].includes(name)) {
      console.error(`Invalid tool name: ${name}`);
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    // Проверяем API-ключ
    if (!openRouterApiKey) {
      console.error("CRITICAL ERROR: OPENROUTER_API_KEY is not set");
      return {
        content: [{ type: "text", text: "OPENROUTER_API_KEY is not set. Please provide it via --api-key parameter." }],
        isError: true,
      };
    }

    try {
      if (name === "ask") {
        const { prompt, model = defaultModel } = args as unknown as AskToolArgs;

        if (!prompt) {
          console.error("Prompt is empty or undefined");
          return {
            content: [{ type: "text", text: "Prompt is required for 'ask' tool" }],
            isError: true,
          };
        }

        console.error(`Sending request to OpenRouter: model=${model}, prompt=${prompt.substring(0, 50)}...`);

        const response: AxiosResponse = await axios.post(
          openRouterApiUrl,
          {
            model,
            messages: [{ role: "user", content: prompt }],
            transforms: ["middle-out"],
            route: "fallback"
          },
          {
            headers: {
              Authorization: `Bearer ${openRouterApiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://github.com/yourusername/mcp-server-code-review",
              "X-Title": "MCP OpenRouter CLI Tool",
              "X-Disable-Training": "true"
            },
          }
        );

        console.error(`Received response: status=${response.status}`);

        if (
          response.data &&
          response.data.choices &&
          Array.isArray(response.data.choices) &&
          response.data.choices.length > 0 &&
          response.data.choices[0].message &&
          typeof response.data.choices[0].message.content === "string"
        ) {
          return {
            content: [{ type: "text", text: response.data.choices[0].message.content }],
          };
        } else {
          console.error(`Invalid response format: ${JSON.stringify(response.data)}`);
          return {
            content: [{ type: "text", text: "Received invalid or empty response from OpenRouter API" }],
            isError: true,
          };
        }
      }

      if (name === "code_review") {
        const {
          completed_tasks = [],
          work_report = "",
          project_path = "",
          planned_tasks = [],
          language = "",
          model = defaultModel,
        } = args as unknown as CodeReviewToolArgs;

        if (!project_path || !language) {
          console.error("Missing required arguments for code_review");
          return {
            content: [{ type: "text", text: "Project path and language are required for 'code_review' tool" }],
            isError: true,
          };
        }

        const projectRoot = this.getProjectRoot(project_path, language);
        const codeBase = await this.runRepomix(projectRoot);

        const prompt = `
Я выполнил следующие задачи: ${JSON.stringify(completed_tasks)}.
Вот как я их выполнял: ${work_report}.
Вот текущий код проекта после моих правок: \n\`\`\`\n${codeBase}\n\`\`\`\n
Следующие планируемые задачи: ${JSON.stringify(planned_tasks)}.
Проведи код-ревью проекта, проверь корректность выполнения задач. Если найдешь ошибки и проблемы в коде, напиши о них и дай рекомендации по исправлению. Напиши рекомендации по выполнению последующих задач.
`;

        console.error(`Sending code_review request: model=${model}`);

        const response: AxiosResponse = await axios.post(
          openRouterApiUrl,
          {
            model,
            messages: [{ role: "user", content: prompt }],
            transforms: ["middle-out"],
            route: "fallback"
          },
          {
            headers: {
              Authorization: `Bearer ${openRouterApiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://github.com/yourusername/mcp-server-code-review",
              "X-Title": "MCP OpenRouter CLI Tool",
              "X-Disable-Training": "true"
            },
          }
        );

        if (
          response.data &&
          response.data.choices &&
          Array.isArray(response.data.choices) &&
          response.data.choices.length > 0 &&
          response.data.choices[0].message &&
          typeof response.data.choices[0].message.content === "string"
        ) {
          return {
            content: [{ type: "text", text: response.data.choices[0].message.content }],
          };
        } else {
          console.error(`Invalid response format: ${JSON.stringify(response.data)}`);
          return {
            content: [{ type: "text", text: "Received invalid or empty response from OpenRouter API" }],
            isError: true,
          };
        }
      }

      throw new Error("Unreachable code");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error in callTool: ${message}`);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
}

// Создаём сервер
console.error("Starting MCP server initialization...");
const server = new Server(
  {
    name: "openrouter-stdio",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);
console.error("Server created");

const openRouterServer = new OpenRouterServer();

// Добавляем обработчики запросов
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error("Handling listTools request");
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  console.error(`Handling callTool request for tool: ${request.params.name}`);
  console.error(`Request params: ${JSON.stringify(request.params)}`);
  
  try {
    const result = await openRouterServer.callTool(request.params);
    console.error(`Tool result: ${JSON.stringify(result)}`);
    return {...result};
  } catch (error) {
    console.error(`Error in callTool handler: ${error instanceof Error ? error.message : String(error)}`);
    return {
      content: [{ type: "text", text: `Error processing tool: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true
    };
  }
});

// Запускаем сервер
async function runServer(): Promise<void> {
  console.error("Starting server...");
  try {
    // Логируем параметры
    console.error(`OPENROUTER_API_KEY provided: ${openRouterApiKey ? "Yes" : "No"}`);
    console.error(`DEFAULT_MODEL set to: ${defaultModel}`);

    const transport = new StdioServerTransport();
    console.error("Transport created");

    // Подключаем транспорт
    await server.connect(transport);
    console.error("OpenRouter MCP Server running on stdio");
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

runServer();
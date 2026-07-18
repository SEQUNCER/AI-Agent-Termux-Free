# AI Agent Termux

Free AI coding assistant for Termux (Android). Uses OpenRouter free models.

## Установка на Termux

### 1. Установи Termux

Скачай последнюю версию с GitHub:
- **F-Droid**: https://f-droid.org/packages/com.termux/
- **GitHub Releases**: https://github.com/termux/termux-app/releases

> Не ставь из Google Play — там старая версия.

### 2. Открой Termux и выполни:

```bash
pkg update && pkg upgrade -y
pkg install nodejs git -y
```

### 3. Клонируй или скопируй проект

```bash
git clone https://github.com/SEQUNCER/AI-Agent-Termux-Free.git
cd ai-agent-termux
```

Если нет git — скопируй папку вручную через `cp` или `rsync`.

### 4. Установи зависимости

```bash
npm install
```

### 5. Запуск

```bash
node index.js
```

Или сделай алиас:

```bash
echo "alias ai='node ~/ai-agent-termux/index.js'" >> ~/.bashrc
source ~/.bashrc
ai
```

## Команды внутри чата

| Команда   | Описание                     |
|-----------|------------------------------|
| `/model`  | Сменить модель               |
| `/clear`  | Очистить историю             |
| `/exit`   | Выйти (или Ctrl+C)           |
| `/help`   | Показать помощь              |
| `/debug`  | Включить/выключить debug     |

## Модели (все бесплатные)

| # | Модель                              |
|---|-------------------------------------|
| 1 | Tencent Hy3                         |
| 2 | Nemotron Ultra 550B                 |
| 3 | Laguna M1                           |
| 4 | Nemotron Super 120B                 |
| 5 | Cohere North Mini Code              |
| 6 | Laguna XS 2.1                       |
| 7 | **Nemotron Nano 30B** (по умолчанию)|
| 8 | Nemotron Nano Omni Reasoning        |
| 9 | GPT OSS 20B                         |
|10 | Gemma 4 31B                         |

## Возможности

- Чтение/запись/редактирование файлов
- Выполнение shell-команд
- Поиск файлов (glob) и содержимого (grep)
- Поиск в вебе и загрузка URL
- Стриминг ответов в реальном времени
- Анимация при генерации
- Таймстемпы у каждого сообщения
- Замер времени выполнения инструментов

## Структура проекта

```
ai-agent-termux/
├── index.js           # Точка входа
├── run.bat            # Для Windows
├── package.json
├── README.md
└── src/
    ├── chat.js        # Основной цикл чата
    ├── config.js      # Модели + API ключ + системный промпт
    ├── openrouter.js  # API клиент для OpenRouter
    ├── tools.js       # Инструменты (файлы, bash, поиск)
    └── ui.js          # Стили и утилиты для интерфейса
```

## Зависимости

- Node.js 18+
- Пакет `glob` (устанавливается через `npm install`)
- OpenRouter API ключ (уже встроен)

## Примечания

- Все модели бесплатные, но могут иметь rate limits
- Если модель не отвечает — выбери другую через `/model`
- На Termux интерфейс адаптируется под ширину терминала автоматически

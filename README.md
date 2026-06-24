<p align="center">
  <img src="https://raw.githubusercontent.com/Eugeneofficial/3DimM/main/assets/banner.svg" alt="3DimM — Universal Video Downloader" width="100%"/>
</p>

<h3 align="center">Universal Video Downloader</h3>

<p align="center">
  Скачивайте видео с YouTube, TikTok, Twitter, Instagram и <strong>1000+ сайтов</strong>
</p>

<p align="center">
  <a href="#возможности">Возможности</a> •
  <a href="#установка">Установка</a> •
  <a href="#запуск">Запуск</a> •
  <a href="#api">API</a> •
  <a href="#технологии">Технологии</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-6366f1?style=flat-square&logo=semver&logoColor=white" alt="Version"/>
  <img src="https://img.shields.io/badge/Electron-33-47848F?style=flat-square&logo=electron&logoColor=white" alt="Electron"/>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React"/>
  <img src="https://img.shields.io/badge/License-MIT-10b981?style=flat-square" alt="License"/>
  <img src="https://img.shields.io/badge/Platforms-Win%20%7C%20Mac%20%7C%20Linux-94a3b8?style=flat-square" alt="Platforms"/>
</p>

---

## Возможности

<table>
<tr>
<td width="50%">

### Универсальное скачивание
Скачивайте видео с **1000+ сайтов** через yt-dlp:
- YouTube, YouTube Music
- TikTok, Instagram Reels
- Twitter / X
- Twitch (стримы и клипы)
- VK Video, OK.ru, Rutube
- Reddit, Vimeo, Dailymotion
- SoundCloud, Telegram
- И многие другие

</td>
<td width="50%">

### Встроенный плеер
Воспроизведение **m3u8 HLS-видео** прямо в приложении:
- DPlayer + hls.js
- Автоматический прокси
- Выбор дорожек (аудио/субтитры)
- Тест скорости серверов
- Выбор качества перед скачиванием

</td>
</tr>
<tr>
<td>

### Очередь загрузок
Пакетная загрузка с прогрессом:
- Добавляйте видео в очередь
- Мини-прогрессбар для каждого
- Шуточные фразы при скачивании
- Приоритеты загрузок

</td>
<td>

### Desktop приложение
Полнофункциональный Electron:
- Нативные диалоги сохранения
- Горячие клавиши (Ctrl+S)
- Drag & Drop ссылок
- Настройки (папка, порт, лимиты)
- Авто-обновление

</td>
</tr>
</table>

---

## Быстрый старт

### Установка зависимостей

```bash
# Клонируем репозиторий
git clone https://github.com/Eugeneofficial/3DimM.git
cd 3DimM

# Устанавливаем все зависимости
npm run install:all
```

### Системные зависимости

| Зависимость | Зачем | Установка |
|-------------|-------|-----------|
| **Node.js 18+** | JavaScript runtime | [nodejs.org](https://nodejs.org/) |
| **ffmpeg** | Конвертация видео | `winget install ffmpeg` |
| **yt-dlp** | Скачивание с сайтов | `winget install yt-dlp` |
| **Python 3.10+** | Для плагинов yt-dlp | [python.org](https://python.org/) |

### Плагины YouTube (рекомендуется)

YouTube требует **PO Token** для скачивания видео. Установите плагины:

```bash
pip install bgutil-ytdlp-pot-provider yt-dlp-getpot-wpc yt-dlp-ejs
```

| Плагин | Описание |
|--------|----------|
| `bgutil-ytdlp-pot-provider` | Автоматическая генерация PO Token через BgUtils |
| `yt-dlp-getpot-wpc` | Fallback — генерация PO Token через браузер |

### YouTube cookies (для age-restricted контента)

Для скачивания age-restricted видео нужны cookies из браузера:

1. Откройте **инкогнито-окно** → зайдите на youtube.com
2. Перейдите на `https://www.youtube.com/robots.txt`
3. Экспортируйте cookies расширением **"Get cookies.txt LOCALLY"**
4. Закройте инкогнито-окно
5. В настройках 3DimM укажите путь к файлу cookies.txt

> **Примечание:** OAuth2 и AgeGate Bypass плагины **не работают** — YouTube заблокировал эти методы.

---

## Запуск

### Development (веб-версия)

```bash
npm run dev
```

| Сервис | URL |
|--------|-----|
| Клиент (Vite) | http://localhost:5173 |
| API сервер | http://localhost:3001 |

### Electron (десктоп)

```bash
npm run dev:electron
```

### Production сборка

```bash
npm run build:win    # Windows (NSIS installer)
npm run build:mac    # macOS (DMG)
npm run build:linux  # Linux (AppImage)
```

---

## Структура проекта

```
3DimM/
├── client/                  # React + Vite
│   ├── src/
│   │   ├── App.jsx          # Layout: sidebar + content
│   │   ├── theme.js         # Дизайн-токены (indigo palette)
│   │   ├── api.js           # API-клиент
│   │   ├── store.js         # Zustand state
│   │   ├── funMessages.js   # Шуточные фразы
│   │   └── components/
│   │       ├── Sidebar.jsx        # Навигация
│   │       ├── UrlInput.jsx       # Ввод URL + видео-инфо
│   │       ├── VideoPlayer.jsx    # HLS плеер
│   │       ├── PlatformGrid.jsx   # Иконки платформ
│   │       ├── FeatureCards.jsx    # Карточки фич
│   │       ├── DownloadsPanel.jsx  # История загрузок
│   │       ├── QueuePanel.jsx      # Очередь
│   │       ├── SettingsPanel.jsx   # Настройки
│   │       ├── Toast.jsx           # Уведомления
│   │       └── ErrorBoundary.jsx   # Обработка ошибок
│   └── vite.config.js
├── server/                  # Express API
│   └── index.js
├── shared/                  # Общий код (роутеры)
│   ├── videoRouter.js       # m3u8/ffmpeg
│   ├── ytDlpRouter.js       # yt-dlp
│   └── logger.js
├── electron/                # Electron main
│   ├── main.js
│   └── preload.js
└── package.json
```

---

## API

### m3u8 / FFmpeg

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/api/extract?url=...` | GET | Поиск m3u8 на странице |
| `/api/proxy?url=...` | GET | Проксирование m3u8 |
| `/api/speed-test?url=...` | GET | Тест скорости серверов |
| `/api/tracks?url=...` | GET | Список дорожек |
| `/api/download` | POST | Скачивание в MP4 |
| `/api/download/progress?id=...` | GET | SSE прогресс |

### yt-dlp (Universal)

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/api/detect?url=...` | GET | Определение типа ссылки |
| `/api/info?url=...` | GET | Информация о видео |
| `/api/formats?url=...` | GET | Доступные форматы |
| `/api/universal-download` | POST | Скачивание через yt-dlp |
| `/api/universal-progress?id=...` | GET | SSE прогресс |

---

## Технологии

<table>
<tr>
<td><strong>Frontend</strong></td>
<td>React 18, Vite, Zustand, DPlayer, hls.js</td>
</tr>
<tr>
<td><strong>Backend</strong></td>
<td>Express, fluent-ffmpeg, Node.js</td>
</tr>
<tr>
<td><strong>Desktop</strong></td>
<td>Electron 33, electron-builder</td>
</tr>
<tr>
<td><strong>Инструменты</strong></td>
<td>yt-dlp, ffmpeg</td>
</tr>
<tr>
<td><strong>DevOps</strong></td>
<td>ESLint, Prettier, Vitest, GitHub Actions</td>
</tr>
</table>

---

## Команды

| Команда | Описание |
|---------|----------|
| `npm run install:all` | Установить все зависимости |
| `npm run dev` | Запустить в dev-режиме |
| `npm run dev:electron` | Запустить Electron |
| `npm run build:client` | Собрать клиент |
| `npm run build:win` | Собрать Windows installer |
| `npm run lint` | Проверить код |
| `npm run test` | Запустить тесты |

---

## Лицензия

MIT License — свободное использование и модификация.

---

<p align="center">
  Сделано с ❤️ для тех, кто хочет скачивать видео просто и быстро
</p>

# PROJECT_DOCS

Техническая документация по текущему состоянию проекта `LevelUPMe`.

## 0. Архитектурный ориентир

- Цель: любой контентный блок на публичном сайте управляется через админ-панель.
- Текущее исключение: блок `HowItWorks` использует фиксированные тексты карточек и фиксированную строку стоимости. Поле `Settings.workflowItems` сохраняется в БД, но публичной страницей не используется.

## 1. Стек

- `Next.js 14` (App Router)
- `React 18`
- `TypeScript`
- `Tailwind CSS`
- `Prisma` + `PostgreSQL`
- `Yandex Disk API` — хранение изображений
- `bcryptjs` — хэширование пароля
- `zod` — валидация данных
- `sharp` — обработка изображений (используется Next.js внутренне)

> `lucide-react` и `clsx` удалены — не использовались.

## 2. Хранение изображений

### 2.1 Как работает прокси-роут

Яндекс.Диск отдаёт файлы через временные подписанные URL (~30 мин) с заголовком
`Content-Disposition: attachment`, который браузер не рендерит в `<img>`.

Решение: **все изображения отдаются через `/api/photos/image?key=STORAGE_KEY`**.

```
Браузер → GET /api/photos/image?key=...
              ↓
         Наш сервер: расшифровывает key, определяет тип
              ↓  (если ypub:: — вызывает public/resources/download)
              ↓  (если путь — вызывает resources?fields=file)
         Яндекс API возвращает временный URL
              ↓
         Сервер скачивает байты и стримит браузеру с Content-Type: image/jpeg
```

Кэширование: `Cache-Control: public, max-age=86400` на стороне браузера.
Сервер обращается к Яндекс API при каждом промахе кэша.

### 2.2 Форматы storageKey

В поле `Photo.storageKey` хранится один из двух форматов:

| Формат | Пример | Используется для |
|---|---|---|
| Путь на диске | `/site-gallery/1738000-abc-photo.jpg` | Прямые загрузки файлов |
| Публичная ссылка | `ypub::https://disk.yandex.ru/d/abc123::/photo.jpg` | Импорт папки |

**Путь на диске** — файл лежит в папке `YANDEX_DISK_BASE_DIR` на вашем Яндекс.Диске.
При удалении фото с сайта файл удаляется с диска.

**`ypub::` ключ** — оригинальный файл остаётся в вашей папке нетронутым.
При удалении фото с сайта файл на диске **не трогается**.

### 2.3 Совместимость с Node.js 18

В Node.js 18 глобальный `File` недоступен. Проверка при загрузке файла использует
`instanceof Blob` вместо `instanceof File` — `Blob` доступен с Node.js 16,
а multipart-файлы из `formData()` в Next.js являются Blob-совместимыми объектами.

## 3. Структура проекта

```text
app/
  page.tsx                        — публичная главная
  layout.tsx
  admin/
    page.tsx                      — дашборд
    gallery/page.tsx
    categories/page.tsx
    requests/page.tsx
    reviews/page.tsx
    settings/page.tsx
  api/
    auth/route.ts
    busy-dates/route.ts
    busy-dates/[isoDate]/route.ts
    hero-photos/route.ts         — GET: случайные 5 фото для Hero
    photos/route.ts               — GET (список), POST (прямая загрузка)
    photos/[id]/route.ts
    photos/image/route.ts         — GET: прокси-роут для изображений
    photos/import-folder/route.ts — POST: импорт папки (без копирования)
    categories/route.ts
    requests/route.ts
    requests/[id]/route.ts
    reviews/route.ts
    reviews/[id]/route.ts
    settings/route.ts

components/
  Hero.tsx
  AvailabilityRibbon.tsx
  Gallery.tsx
  Lightbox.tsx
  About.tsx
  HowItWorks.tsx
  ContactForm.tsx
  Reviews.tsx
  CookieConsentBanner.tsx
  PublicContextMenuGuard.tsx
  Navigation.tsx
  AdminSidebar.tsx

lib/
  apiUtils.ts           — parseJsonSafe, parseIntParam, parseId, parseJsonIds
  categoryLabel.ts
  cookieConsent.ts
  guards.ts
  prisma.ts
  types.ts              — общие типы (включая HeroPhoto)
  security.ts           — rate limiting, CSRF
  storage/
    yandexDisk.ts       — весь код работы с Яндекс.Диском
```

## 4. lib/apiUtils.ts

Общие утилиты, вынесенные из дублирующихся определений в 11 API-файлах:

```typescript
parseJsonSafe(request)         // безопасный JSON.parse тела запроса
parseIntParam(value, fallback) // parseInt с clamp и fallback
parseId(value)                 // распарсить целочисленный ID > 0
parseJsonIds(value)            // JSON-массив числовых ID
```

## 5. lib/storage/yandexDisk.ts — публичный API

| Экспорт | Описание |
|---|---|
| `uploadImageToYandexDisk(file)` | Загрузить File/Blob на диск, вернуть `{imageUrl, storageKey}` |
| `deleteYandexDiskResource(key)` | Удалить файл с диска (пропускает `ypub::` ключи) |
| `buildPublicFileKey(publicKey, filePath)` | Собрать `ypub::` ключ |
| `readPublicFolder(publicKey)` | Прочитать список изображений в публичной папке без скачивания |
| `FolderMetaFile` | Тип: `{ name, path, title }` |
| `FolderMetaResult` | Тип: `{ folderName, publicKey, files[] }` |

## 6. Публичная часть

### 6.0 Верхняя навигация
- В узких вьюпортах приоритет у ссылок разделов.
- Бренд «Ваш фотограф — Рамазан Беев» автоматически скрывается, если его присутствие приводит к переносу/переполнению меню.

### 6.1 Hero
- Заголовок + подзаголовок + кнопка CTA.
- Фон: слайдшоу из фото `showInSlideshow`.
- На каждый HTTP-запрос клиент запрашивает `/api/hero-photos`, который возвращает случайные 5 фото.
- Если запрос к `/api/hero-photos` недоступен, используется SSR fallback-набор (до 5 фото).
- Между кадрами используется плавный `crossfade`-переход (без резкой смены слайдов).
- Визуальный стиль: «киношный» оверлей без дорогих runtime-фильтров (`blur/grayscale`) на весь экран.
- Контраст текста усилен за счёт более плотных оверлеев и `text-shadow` у заголовка/подзаголовка.

### 6.2 Лента доступности дат (`AvailabilityRibbon`)
- 10 дней от завтрашнего дня.
- Подпись месяца:
  - один месяц: `март 2026`
  - два месяца одного года: `Март-Апрель`
  - разные годы: `Декабрь 2026-Январь 2027`
- При клике на свободную дату: скролл к `#contacts` + dispatch `shooting-date:selected`.
- `ContactForm` слушает событие и подставляет дату в поле.
- Источник: таблица `BusyDate` (`isoDate` в формате `YYYY-MM-DD`).

### 6.3 Галерея
- Фильтры по категориям, сетка карточек.
- В публичной части отображаются только категории, в которых есть минимум одно фото с `showInGallery = true`.
- Режим «Все»: первые 12 фото, кнопка-индикатор «Ещё N фото».
- Порядок в режиме «Все»: `Category.sortOrder` → `Photo.sortOrder`.

### 6.4 Лайтбокс
- Минималистичный оверлей: нет заголовка/счётчика/крестика.
- Нециклическая навигация (стрелки только если есть куда листать).
- Поддержка: `ArrowLeft/ArrowRight`, свайп, клик по фото → вперёд.
- На последнем фото клик → закрыть.

### 6.5 Обо мне
- Автокроссфейд (без стрелок и dots).

### 6.6 Как всё устроено
- 3 фиксированных карточки + строка стоимости.
- `Settings.workflowItems` — только сохраняется, не рендерится публично.

### 6.7 Отзывы
- Показываются только `isPublished = true`, упорядочены по `sortOrder`.
- Блок скрывается, если нет опубликованных отзывов.

### 6.8 Форма контактов
- Inline-валидация, чекбокс согласия, thank-you экран.
- Основная кнопка отправки: `Договориться о съёмке`.

## 7. Админ-панель

### 7.1 Галерея: загрузка файлов (прямая)
- 1–10 файлов за операцию, drag&drop.
- Файлы загружаются в `YANDEX_DISK_BASE_DIR` на ваш Яндекс.Диск.
- Прогресс по реально переданным байтам (`XMLHttpRequest.upload.onprogress`).
- Лимит: 10 МБ на файл, форматы JPEG/PNG/WebP.

### 7.2 Галерея: импорт папки (без копирования)
- Вставьте публичную ссылку на папку Яндекс.Диска.
- Сервер читает список файлов через `readPublicFolder()` — без скачивания.
- Создаётся/находится категория с именем папки.
- Для каждого файла сохраняется `ypub::` ключ — оригинал остаётся нетронутым.
- Все импортированные фото: `showInGallery = true` (сразу на витрине).
- Прогресс: фаза `start` (чтение папки) → фаза `db` (создание записей).
- Ссылки вида `/client/disk/...` отклоняются с понятной ошибкой.

### 7.3 Занятые даты
- Управление в `Админка → Заявки → Календарь`.
- Без заявки занять дату нельзя.
- Нормализация даты: локальный `YYYY-MM-DD` без `toISOString()` (исключает сдвиг timezone).

### 7.4 Настройки
- Тексты/контакты/hero/«обо мне»/«как устроено».
- Смена пароля (bcrypt-хэш в `Settings.adminPasswordHash`).

### 7.5 Категории
- Полный CRUD, drag-and-drop порядок (кнопки ↑↓).
- Предупреждение при удалении категории с фото.

### 7.6 Отзывы
- CRUD + публикация/скрытие + изменение порядка.

## 8. Схема БД (Prisma)

```prisma
Photo {
  imageUrl   String   // /api/photos/image?key=...
  storageKey String?  // путь /site-gallery/... или ypub::...
}

Category {
  sortOrder Int @default(0)
}

BusyDate {
  isoDate   String @unique  // YYYY-MM-DD
  requestId -> ContactRequest
}

Review {
  authorName  String
  text        String
  sortOrder   Int @default(0)
  isPublished Boolean @default(true)
}

ContactRequest {
  shootingDate String
}

Settings {
  busyDates String  // legacy, не используется в новом календаре
}
```

## 9. API — полный список

| Метод + путь | Описание |
|---|---|
| `GET /api/settings` | Чтение настроек |
| `PUT /api/settings` | Сохранение настроек |
| `GET /api/hero-photos` | Случайные 5 фото для Hero (`showInSlideshow = true`) |
| `GET /api/photos` | Список фото (с пагинацией) |
| `POST /api/photos` | Загрузка файла → Яндекс.Диск → Photo |
| `PUT /api/photos/[id]` | Редактирование метаданных |
| `DELETE /api/photos/[id]` | Удаление из БД + best-effort удаление с диска |
| `GET /api/photos/image` | Прокси-роут: стримит изображение с Яндекс.Диска |
| `POST /api/photos/import-folder` | Импорт папки (NDJSON-стрим прогресса) |
| `GET /api/categories` | Список категорий |
| `POST /api/categories` | Создать категорию |
| `PUT /api/categories` | Редактировать / переупорядочить |
| `DELETE /api/categories` | Удалить категорию |
| `GET /api/requests` | Список заявок (с фильтрацией и пагинацией) |
| `POST /api/requests` | Создать заявку (публичная форма) |
| `PUT /api/requests/[id]` | Обновить заявку |
| `DELETE /api/requests/[id]` | Удалить заявку |
| `GET /api/busy-dates` | Список занятых дат |
| `POST /api/busy-dates` | Занять дату (привязать к заявке) |
| `DELETE /api/busy-dates/[isoDate]` | Снять занятость |
| `GET /api/reviews` | Список отзывов |
| `POST /api/reviews` | Создать отзыв |
| `PUT /api/reviews/[id]` | Обновить отзыв |
| `DELETE /api/reviews/[id]` | Удалить отзыв |
| `POST /api/auth` | Авторизация |

### Формат ответа импорта папки (`NDJSON`)

```json
{"type":"progress","phase":"start","message":"Читаем папку..."}
{"type":"progress","phase":"db","completed":5,"total":20}
{"type":"done","importedCount":20,"skippedCount":0,"category":{...},"categoryCreated":true}
{"type":"error","error":"..."}
```

## 10. Деплой (VPS + GitHub Actions)

- `.github/workflows/deploy.yml`: SSH → `git pull` → `npm install` → `npm run build` → `pm2 restart levelupme`
- На VPS добавлен swap 2 ГБ (RAM 961 МБ, без swap OOM при сборке)
- Процесс: `pm2` с именем `levelupme`

## 11. Проверка после изменений

1. Главная открывается без runtime-ошибок.
2. Hero подгружает случайные 5 фото через `/api/hero-photos`; при ошибке остаётся на fallback-наборе.
3. В фильтрах галереи нет категорий, в которых отсутствуют фото витрины.
4. Клик по свободной дате скроллит к форме и подставляет дату.
5. При переходе периода через границу месяца подпись ленты дат отображается диапазоном (`Март-Апрель`).
6. Лайтбокс: навигация клавишами/свайп, на последнем фото клик закрывает.
7. Прямая загрузка файла — фото появляется в галерее и отображается.
8. Импорт папки — категория создаётся, фото видны на витрине, оригиналы на диске не трогались.
9. Открыть `/api/photos/image?key=...` напрямую — должно отдать байты изображения.

## 12. Будущие задачи

- Визуальный эксперимент: `Fractal Glass effect` для слайдера Hero.
- Эффект «блок за блоком» при прокрутке страницы.
- Использовать `Settings.workflowItems` в публичном блоке «Как всё устроено».

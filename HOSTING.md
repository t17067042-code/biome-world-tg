# Постоянный бесплатный хостинг Biome World

## Рекомендация №1: Cloudflare Pages (лучший)

**Почему:**
- Бесплатно навсегда
- Безлимитный трафик (нет лимита ГБ)
- HTTPS, CDN по всему миру
- Без логина/SSO для игроков
- Идеально для Telegram Mini App
- Карта не нужна

### Как подключить (5 минут)

1. Зайди на https://dash.cloudflare.com и зарегистрируйся (email)
2. Слева: **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. Подключи GitHub → выбери репозиторий `t17067042-code/biome-world-tg`
4. Настройки деплоя:
   - **Production branch:** `gh-pages`
   - **Build command:** (пусто)
   - **Build output directory:** `/` (корень)
5. **Save and Deploy**
6. Получишь URL вида: `https://biome-world-tg.pages.dev`

После этого напиши мне этот URL — я пропишу его в кнопку бота.

---

## Рекомендация №2: GitHub Pages (уже почти есть)

1. Открой https://github.com/t17067042-code/biome-world-tg/settings/pages
2. **Source:** Deploy from a branch
3. **Branch:** `gh-pages` / folder `/ (root)`
4. Save
5. Через 1–2 минуты откроется: `https://t17067042-code.github.io/biome-world-tg/`

Пока github.io может давать 404 — пока не включишь Pages в Settings.

**Сейчас работает через CDN (постоянно):**
https://cdn.jsdelivr.net/gh/t17067042-code/biome-world-tg@gh-pages/index.html

---

## Что НЕ брать

| Хост | Проблема |
|------|----------|
| Netlify free | Кончились кредиты, лимит трафика |
| Vercel Hobby | SSO-логин ломает Telegram WebApp |
| litterbox/catbox | Временные ссылки |
| Render free | Засыпает без трафика |

---

## Для бота 24/7 (кнопка /start)

Статический хост = только игра. Для ответа бота на /start нужен webhook:
- Cloudflare Workers (бесплатно 100k запросов/день) — лучший вариант вместе с Pages
- Или polling раз в час (уже есть как запасной)

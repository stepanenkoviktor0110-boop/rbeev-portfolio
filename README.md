# LevelUPMe — сайт-портфолио фотографа

## Запуск

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

Сайт: `http://localhost:3000`  
Админка: `http://localhost:3000/admin`

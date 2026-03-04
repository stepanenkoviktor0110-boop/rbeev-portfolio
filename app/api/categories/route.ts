import { requireAdmin } from '@/lib/guards';
import { prisma } from '@/lib/prisma';
import { parseJsonSafe } from '@/lib/apiUtils';
import { checkRateLimit, getClientIp, rateLimitJsonResponse, requireSameOrigin } from '@/lib/security';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const createCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(80),
  })
  .strict();

const renameCategorySchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().trim().min(1).max(80),
  })
  .strict();

const reorderCategorySchema = z
  .object({
    id: z.number().int().positive(),
    direction: z.enum(['up', 'down']),
  })
  .strict();

const updateCategorySchema = z.union([renameCategorySchema, reorderCategorySchema]);

const deleteCategorySchema = z
  .object({
    id: z.number().int().positive(),
    force: z.boolean().optional(),
  })
  .strict();

function checkAdminCategoryRateLimit(request: Request) {
  const ip = getClientIp(request);
  const rate = checkRateLimit({ key: `admin:categories:${ip}`, limit: 60, windowMs: 10 * 60 * 1000 });
  if (!rate.ok) return rateLimitJsonResponse('Слишком много действий. Попробуйте позже', rate.retryAfterSec);
  return null;
}

export async function GET() {
  const categories = await prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const rl = checkAdminCategoryRateLimit(request);
  if (rl) return rl;

  const parsed = createCategorySchema.safeParse(await parseJsonSafe(request));
  if (!parsed.success) return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });

  try {
    const maxSort = await prisma.category.aggregate({ _max: { sortOrder: true } });
    const category = await prisma.category.create({
      data: {
        name: parsed.data.name,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
    });
    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Категория с таким именем уже существует' }, { status: 409 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const rl = checkAdminCategoryRateLimit(request);
  if (rl) return rl;

  const parsed = updateCategorySchema.safeParse(await parseJsonSafe(request));
  if (!parsed.success) return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });

  if ('direction' in parsed.data) {
    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: { id: true, sortOrder: true },
    });
    const index = categories.findIndex((item) => item.id === parsed.data.id);
    if (index < 0) return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 });

    const targetIndex = parsed.data.direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) {
      const current = await prisma.category.findUnique({ where: { id: parsed.data.id } });
      return NextResponse.json(current);
    }

    const next = [...categories];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);

    await prisma.$transaction(
      next.map((item, idx) =>
        prisma.category.update({
          where: { id: item.id },
          data: { sortOrder: idx + 1 },
        })
      )
    );
    const updated = await prisma.category.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, name: true, sortOrder: true },
    });
    return NextResponse.json(updated);
  }

  try {
    const category = await prisma.category.update({
      where: { id: parsed.data.id },
      data: { name: parsed.data.name },
    });
    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Категория с таким именем уже существует' }, { status: 409 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const rl = checkAdminCategoryRateLimit(request);
  if (rl) return rl;

  const parsed = deleteCategorySchema.safeParse(await parseJsonSafe(request));
  if (!parsed.success) return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });

  try {
    const photoCount = await prisma.photo.count({ where: { categoryId: parsed.data.id } });
    if (photoCount > 0 && !parsed.data.force) {
      return NextResponse.json(
        {
          error: `В категории есть ${photoCount} фото. Подтвердите удаление.`,
          photoCount,
          requiresConfirmation: true,
        },
        { status: 409 }
      );
    }

    const category = await prisma.category.findUnique({
      where: { id: parsed.data.id },
      select: { sortOrder: true },
    });
    if (!category) return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 });

    await prisma.$transaction([
      prisma.category.delete({ where: { id: parsed.data.id } }),
      prisma.category.updateMany({
        where: { sortOrder: { gt: category.sortOrder } },
        data: { sortOrder: { decrement: 1 } },
      }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return NextResponse.json({ error: 'Категория используется фотографиями и не может быть удалена' }, { status: 409 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
    console.log('Prisma Init: DATABASE_URL =', process.env.DATABASE_URL);
    globalForPrisma.prisma = prisma;
}

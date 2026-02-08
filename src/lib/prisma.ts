import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from '@prisma/adapter-neon'

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient;
};

const connectionString = `${process.env.DATABASE_URL}`

const adapter = new PrismaNeon({ connectionString })
const prisma = globalForPrisma.prisma || new PrismaClient({adapter});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

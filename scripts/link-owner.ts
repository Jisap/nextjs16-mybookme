import { prisma } from "../src/lib/db";

// Uso: npm run link:owner -- email=tu@email.com slug=maria-nails role=OWNER
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.split("=");
  return [k, v];
}));
const email = args.email as string | undefined;
const slug = (args.slug as string | undefined) ?? "maria-nails";
const role = ((args.role as string | undefined) ?? "OWNER").toUpperCase() as "OWNER" | "STAFF";

async function main() {
  if (!email) throw new Error("falta email=...");
  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) throw new Error(`User ${email} no existe: entra primero en /login para crearlo`);
  const business = await prisma.business.findUnique({ where: { slug } });
  if (!business) throw new Error(`Business ${slug} no existe`);
  await prisma.businessMember.upsert({
    where: { businessId_userId: { businessId: business.id, userId: user.id } },
    update: { role },
    create: { businessId: business.id, userId: user.id, role },
  });
  console.log(`link ok: ${email} → ${slug} (${role})`);
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

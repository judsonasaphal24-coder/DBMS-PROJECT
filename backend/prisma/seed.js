const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const users = [
    { name: "Aarav Mehta", email: "aarav@example.com", password: "User@1234", balance: 2500 },
    { name: "Diya Sharma", email: "diya@example.com", password: "User@1234", balance: 1800 },
    { name: "Kabir Singh", email: "kabir@example.com", password: "User@1234", balance: 900 },
  ];

  const admin = {
    email: "admin@pulsepay.com",
    password: "admin@123",
  };

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash,
        role: "USER",
        wallet: {
          upsert: {
            create: { balance: user.balance },
            update: { balance: user.balance },
          },
        },
      },
      create: {
        name: user.name,
        email: user.email,
        passwordHash,
        role: "USER",
        wallet: { create: { balance: user.balance } },
      },
    });
  }

  const adminHash = await bcrypt.hash(admin.password, 10);
  await prisma.admin.upsert({
    where: { email: admin.email },
    update: { passwordHash: adminHash },
    create: { email: admin.email, passwordHash: adminHash },
  });

  const aarav = await prisma.user.findUnique({ where: { email: "aarav@example.com" } });
  const diya = await prisma.user.findUnique({ where: { email: "diya@example.com" } });
  const kabir = await prisma.user.findUnique({ where: { email: "kabir@example.com" } });

  if (!aarav || !diya || !kabir) {
    throw new Error("Seed users were not created correctly");
  }

  const existingTransactions = await prisma.transaction.count();
  if (existingTransactions === 0) {
    await prisma.transaction.createMany({
      data: [
        {
          senderId: aarav.id,
          receiverId: diya.id,
          amount: 150,
          status: "SUCCESS",
          description: "Dinner split",
        },
        {
          senderId: diya.id,
          receiverId: kabir.id,
          amount: 75,
          status: "SUCCESS",
          description: "Coffee",
        },
        {
          senderId: kabir.id,
          receiverId: aarav.id,
          amount: 25,
          status: "FAILED",
          description: "Failed demo transfer",
          failureReason: "Insufficient balance",
        },
      ],
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed complete");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

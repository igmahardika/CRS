import { PrismaClient } from '@prisma/client';
import { getSlaByServiceName } from '../lib/service-sla';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting automated Customer SLA synchronization...');
  const customers = await prisma.customer.findMany({
    select: { id: true, customerName: true, serviceName: true, targetSla: true },
  });

  console.log(`Found ${customers.length} customers.`);

  let updatedCount = 0;
  const breakdown: Record<number, number> = { 99.5: 0, 98.0: 0, 95.0: 0, 0: 0 };

  for (const c of customers) {
    const { targetSla } = getSlaByServiceName(c.serviceName);
    breakdown[targetSla] = (breakdown[targetSla] || 0) + 1;

    if (c.targetSla !== targetSla) {
      await prisma.customer.update({
        where: { id: c.id },
        data: { targetSla },
      });
      updatedCount++;
    }
  }

  console.log('Synchronization completed!');
  console.log(`Updated ${updatedCount} customers.`);
  console.log('Breakdown by Target SLA:');
  console.log(`- SLA 99.5%: ${breakdown[99.5]} customers`);
  console.log(`- SLA 98.0%: ${breakdown[98.0]} customers`);
  console.log(`- SLA 95.0%: ${breakdown[95.0]} customers`);
  console.log(`- Tanpa SLA (0%): ${breakdown[0]} customers`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


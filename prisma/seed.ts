import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // App Config
  const existingConfig = await prisma.appConfig.findUnique({
    where: { id: 'default' },
  });

  if (!existingConfig) {
    await prisma.appConfig.create({
      data: {
        id: 'default',
        mrtgBaseUrl: 'http://cacti.internal.net',
        mrtgUsername: '',
        mrtgPassword: '',
        mrtgAuthType: 'BASIC',
        coverMrtgPath: '/assets/templates/cover_mrtg.png',
        coverSlaPath: '/assets/templates/cover_sla.png',
        pageBgPath: '/assets/templates/page_bg.png',
        defaultTargetSla: 99.5,
        documentNumberPrefix: 'IMUN.01',
      },
    });
    console.log('AppConfig created.');
  }

  // Seed default customers
  const sampleCustomers = [
    {
      customerName: 'RSJ. Dr. Soeharto Heerdjan',
      customerId: '01.2180.0824',
      serviceId: '01.2180.1',
      serviceName: 'Prime 300 Mbps',
      nodeCount: 1,
      targetSla: 99.5,
      graphId: '2180',
      trafficDirection: 'REVERSED', // In the sample PDF: Download = Outbound, Upload = Inbound
    },
    {
      customerName: 'Linknet - Site BFI',
      customerId: '01.1496.0624',
      serviceId: '01.1496.31',
      serviceName: 'Prime 100 Mbps',
      nodeCount: 1,
      targetSla: 99.5,
      graphId: '1496',
      trafficDirection: 'NORMAL',
    },
    {
      customerName: 'Uniqlo Queen City Mall',
      customerId: '01.3320.0924',
      serviceId: '01.3320.1',
      serviceName: 'Prime 200 Mbps',
      nodeCount: 1,
      targetSla: 99.5,
      graphId: '3320',
      trafficDirection: 'NORMAL',
    },
  ];

  for (const c of sampleCustomers) {
    const existing = await prisma.customer.findFirst({
      where: { customerId: c.customerId },
    });
    if (!existing) {
      await prisma.customer.create({ data: c });
      console.log(`Created sample customer: ${c.customerName}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

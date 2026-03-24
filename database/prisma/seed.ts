import { DevelopmentBootstrapService } from "../../backend/src/modules/bootstrap/development-bootstrap-service.js";
import { GridManager } from "../../backend/src/modules/grid/grid-manager.js";
import { prisma } from "../../backend/src/persistence/prisma.js";

const run = async (): Promise<void> => {
  const gridManager = new GridManager({ width: 40, height: 25 });
  const bootstrapService = new DevelopmentBootstrapService(prisma, gridManager);

  await bootstrapService.bootstrap();
  await prisma.$disconnect();
};

void run().catch(async (error: unknown) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});

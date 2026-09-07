import { prisma } from "../src/server/db/prisma";
import { parseEatwildCliArgs } from "../src/features/importers/eatwild/cli";
import { runEatwildImport } from "../src/features/importers/eatwild/adapter";

async function main() {
  const options = parseEatwildCliArgs(process.argv.slice(2));
  const summary = await runEatwildImport(prisma, options);
  console.log(JSON.stringify(summary, null, 2));

  if (summary.blocked) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

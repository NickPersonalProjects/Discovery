import { NextResponse } from "next/server";
import { getServerFarmRepository } from "@/features/farms/repository-server";

export async function GET() {
  const repository = getServerFarmRepository();
  const health = await repository.health();
  return NextResponse.json(health, {
    status: health.ok ? 200 : 503,
  });
}

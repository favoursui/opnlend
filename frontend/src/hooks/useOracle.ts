import { useReadContract } from "wagmi";
import { CONTRACTS, ORACLE_ABI } from "@/config/contracts";

export function useOraclePrice() {
  const { data, refetch } = useReadContract({
    address: CONTRACTS.oracle,
    abi: ORACLE_ABI,
    functionName: "getPrice",
  });

  const priceUsd = data ? Number(data) / 1e8 : 1;

  return { priceUsd, refetch };
}

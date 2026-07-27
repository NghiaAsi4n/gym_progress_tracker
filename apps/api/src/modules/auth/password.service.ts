import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const ALGORITHM = "scrypt";
const BLOCK_SIZE = 8;
const KEY_LENGTH = 64;
const MAX_MEMORY = 256 * 1024 * 1024;
const PARALLELIZATION = 1;
const SALT_LENGTH = 16;

interface PasswordServiceOptions {
  cost?: number;
}

function deriveKey(password: string, salt: Buffer, cost: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      {
        cost,
        blockSize: BLOCK_SIZE,
        maxmem: MAX_MEMORY,
        parallelization: PARALLELIZATION,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(derivedKey);
      },
    );
  });
}

function isValidCost(cost: number): boolean {
  return Number.isInteger(cost) && cost > 1 && (cost & (cost - 1)) === 0;
}

export function createPasswordService(options: PasswordServiceOptions = {}) {
  const cost = options.cost ?? 2 ** 17;

  if (!isValidCost(cost)) {
    throw new Error("Password scrypt cost must be a power of two greater than one");
  }

  return {
    async hash(password: string): Promise<string> {
      const salt = randomBytes(SALT_LENGTH);
      const derivedKey = await deriveKey(password, salt, cost);

      return [
        ALGORITHM,
        cost,
        BLOCK_SIZE,
        PARALLELIZATION,
        salt.toString("base64url"),
        derivedKey.toString("base64url"),
      ].join("$");
    },

    async verify(password: string, encodedHash?: string): Promise<boolean> {
      const parts = encodedHash?.split("$");
      const storedCost = Number(parts?.[1]);
      const storedBlockSize = Number(parts?.[2]);
      const storedParallelization = Number(parts?.[3]);
      const salt = parts?.[4] ? Buffer.from(parts[4], "base64url") : Buffer.alloc(SALT_LENGTH);
      const storedKey = parts?.[5] ? Buffer.from(parts[5], "base64url") : Buffer.alloc(KEY_LENGTH);
      const isSupportedHash =
        parts?.length === 6 &&
        parts[0] === ALGORITHM &&
        isValidCost(storedCost) &&
        storedBlockSize === BLOCK_SIZE &&
        storedParallelization === PARALLELIZATION &&
        salt.length === SALT_LENGTH &&
        storedKey.length === KEY_LENGTH;
      const derivedKey = await deriveKey(password, salt, isSupportedHash ? storedCost : cost);

      return (
        isSupportedHash &&
        storedKey.length === derivedKey.length &&
        timingSafeEqual(storedKey, derivedKey)
      );
    },
  };
}

export type PasswordService = ReturnType<typeof createPasswordService>;

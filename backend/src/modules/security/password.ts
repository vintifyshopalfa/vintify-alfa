import bcrypt from "bcrypt"

const BCRYPT_ROUNDS = 12

function getPepper(): string {
  const pepper = process.env.PASSWORD_PEPPER
  if (!pepper) {
    console.warn("[Security] PASSWORD_PEPPER env var not set — using empty pepper. Set this in production!")
    return ""
  }
  return pepper
}

export async function hashPassword(plaintext: string): Promise<string> {
  const pepper = getPepper()
  const peppered = `${pepper}${plaintext}`
  return bcrypt.hash(peppered, BCRYPT_ROUNDS)
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  const pepper = getPepper()
  const peppered = `${pepper}${plaintext}`
  return bcrypt.compare(peppered, hash)
}

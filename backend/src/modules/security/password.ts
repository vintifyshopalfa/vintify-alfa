import bcrypt from "bcrypt"

const BCRYPT_ROUNDS = 12

function getPepper(): string {
  const pepper = process.env.PASSWORD_PEPPER
  if (!pepper) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[Security] PASSWORD_PEPPER env var is required in production. " +
          "Set a random 32+ character value to protect password hashes."
      )
    }
    console.warn(
      "[Security] WARNING: PASSWORD_PEPPER is not set. " +
        "All password hashes will be unsalted with an empty pepper. " +
        "This is insecure — set PASSWORD_PEPPER before going to production."
    )
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

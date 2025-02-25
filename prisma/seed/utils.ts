import bcrypt from 'bcryptjs'

export async function createPassword(password: string) {
  return {
    hash: await bcrypt.hash(password, 10),
  }
}

import { prisma } from '../lib/prisma'
import { decrypt, encrypt } from '../lib/crypto'
import { InstagramService } from '../services/instagram'
import { logger } from '../lib/logger'
import { addDays, isBefore } from 'date-fns'

export async function refreshAllTokens() {
  const accounts = await prisma.iGAccount.findMany({ where: { isActive: true } })

  for (const account of accounts) {
    const daysUntilExpiry = Math.floor(
      (account.tokenExpiresAt.getTime() - Date.now()) / 86400000
    )

    if (daysUntilExpiry <= 7) {
      try {
        const token = decrypt(account.accessToken)
        const ig = new InstagramService(token, account.igUserId)
        const { token: newToken, expiresIn } = await ig.refreshLongLivedToken()

        await prisma.iGAccount.update({
          where: { id: account.id },
          data: {
            accessToken: encrypt(newToken),
            tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
          },
        })

        logger.info({ accountId: account.id }, 'Token refreshed')
      } catch (err: any) {
        logger.error({ accountId: account.id, error: err.message }, 'Token refresh failed')
        // TODO: send email to user
      }
    }
  }
}

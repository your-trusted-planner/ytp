// Returns the variable source registry for the
// template mapping UI. No resolution logic — just
// labels and field definitions.
import { VARIABLE_SOURCES } from '../../config/variable-sources'

export default defineEventHandler(
  async (event) => {
    const { user } = await requireUserSession(
      event,
    )
    if (!['ADMIN', 'LAWYER', 'STAFF']
      .includes(user.role)) {
      throw createError({
        statusCode: 403,
        message: 'Unauthorized',
      })
    }

    return { sources: VARIABLE_SOURCES }
  },
)

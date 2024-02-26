import { z } from 'zod'

interface ICustomResponsePayload {
  status: number;
  message: string;
  data: any;
}

export function CustomResponse(payload: ICustomResponsePayload) {
  return payload;
}

export const ResponseOpenAPITemplate = {
  200: {
    description: '',
    content: {
      'application/json': {
        schema: z.object({
          status: z.number(),
          message: z.string(),
          data: z.any()
        })
      }
    }
  },
  400: {
    description: '',
    content: {
      'application/json': {
        schema: z.object({
          status: z.number(),
          message: z.string(),
          data: z.null()
        })
      }
    }
  }
}

export const BearerSecurityOpenAPITemplate = [
  {
    bearer: [],
  }
]
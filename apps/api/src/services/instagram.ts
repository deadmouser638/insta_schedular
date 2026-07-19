import axios from 'axios'

const GRAPH = 'https://graph.facebook.com/v19.0'

export class IGApiError extends Error {
  constructor(public code: number, message: string) {
    super(message)
    this.name = 'IGApiError'
  }
}

export class InstagramService {
  constructor(private token: string, private igUserId: string) {}

  async createMediaContainer(imageUrl: string, caption: string, type: 'feed' | 'story') {
    const params: Record<string, string> = { access_token: this.token }
    if (type === 'story') {
      params.image_url = imageUrl
      params.media_type = 'STORIES'
    } else {
      params.image_url = imageUrl
      params.caption = caption
    }

    const { data } = await axios.post(`${GRAPH}/${this.igUserId}/media`, params)
    if (data.error) throw new IGApiError(data.error.code, data.error.message)
    return data.id as string
  }

  async publishContainer(containerId: string) {
    const { data } = await axios.post(`${GRAPH}/${this.igUserId}/media_publish`, {
      creation_id: containerId,
      access_token: this.token,
    })
    if (data.error) throw new IGApiError(data.error.code, data.error.message)
    return data.id as string
  }

  async createCarouselContainer(children: string[], caption: string) {
    const childIds: string[] = []
    for (const url of children) {
      const { data } = await axios.post(`${GRAPH}/${this.igUserId}/media`, {
        image_url: url,
        is_carousel_item: true,
        access_token: this.token,
      })
      childIds.push(data.id)
    }

    const { data } = await axios.post(`${GRAPH}/${this.igUserId}/media`, {
      media_type: 'CAROUSEL',
      children: childIds.join(','),
      caption,
      access_token: this.token,
    })
    return data.id as string
  }

  async verifyAccount() {
    const { data } = await axios.get(`${GRAPH}/${this.igUserId}`, {
      params: { fields: 'username,name,ig_id', access_token: this.token },
    })
    if (data.error) throw new IGApiError(data.error.code, data.error.message)
    return data as { username: string; name: string; ig_id: string }
  }

  async refreshLongLivedToken() {
    const { data } = await axios.get(`${GRAPH}/refresh_access_token`, {
      params: { grant_type: 'ig_refresh_token', access_token: this.token },
    })
    return { token: data.access_token as string, expiresIn: data.expires_in as number }
  }
}

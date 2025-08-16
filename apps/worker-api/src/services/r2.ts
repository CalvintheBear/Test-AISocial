export class R2Service {
  constructor(
    private uploadBucket?: R2Bucket,
    private afterBucket?: R2Bucket
  ) {}

  static fromEnv(env: any) {
    return new R2Service(env.R2_UPLOAD, env.R2_AFTER)
  }

  private get isConfigured(): boolean {
    return Boolean(this.uploadBucket && this.afterBucket)
  }

  async putObject(
    bucket: 'upload' | 'after',
    key: string,
    file: File | ArrayBuffer | string,
    contentType?: string
  ): Promise<{ key: string; url: string }> {
    const targetBucket = bucket === 'upload' ? this.uploadBucket : this.afterBucket
    
    if (!targetBucket) {
      throw new Error('R2 bucket not configured')
    }

    const objectKey = `${Date.now()}-${key}`
    
    await targetBucket.put(objectKey, file, {
      httpMetadata: {
        contentType: contentType || 'application/octet-stream',
        cacheControl: 'public, max-age=31536000',
      },
    })

    // In Cloudflare Workers, we need to construct the public URL
    // The actual URL will depend on your R2 domain configuration
    const url = `https://r2.example.com/${objectKey}`
    
    return { key: objectKey, url }
  }

  async getObject(bucket: 'upload' | 'after', key: string): Promise<R2ObjectBody | null> {
    const targetBucket = bucket === 'upload' ? this.uploadBucket : this.afterBucket
    
    if (!targetBucket) {
      return null
    }

    return targetBucket.get(key)
  }

  async getPublicUrl(bucket: 'upload' | 'after', key: string): Promise<string> {
    // This is a placeholder URL pattern
    // In production, you would use your actual R2 custom domain
    const baseUrl = bucket === 'upload' 
      ? 'https://upload.your-domain.com'
      : 'https://after.your-domain.com'
    
    return `${baseUrl}/${key}`
  }

  async deleteObject(bucket: 'upload' | 'after', key: string): Promise<void> {
    const targetBucket = bucket === 'upload' ? this.uploadBucket : this.afterBucket
    
    if (!targetBucket) {
      throw new Error('R2 bucket not configured')
    }

    await targetBucket.delete(key)
  }
}
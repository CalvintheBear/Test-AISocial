export class R2Service {
  constructor(
    private uploadBucket?: R2Bucket,
    private afterBucket?: R2Bucket,
    private publicUploadBase?: string,
    private publicAfterBase?: string,
  ) {}

  static fromEnv(env: any) {
    return new R2Service(
      env.R2_UPLOAD,
      env.R2_AFTER,
      env.R2_PUBLIC_UPLOAD_BASE,
      env.R2_PUBLIC_AFTER_BASE,
    )
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

    // Build public URL using configured base if provided
    const url = await this.getPublicUrl(bucket, objectKey)
    
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
    const baseUrl = bucket === 'upload'
      ? (this.publicUploadBase || 'https://upload.example.com')
      : (this.publicAfterBase || 'https://after.example.com')
    return `${baseUrl.replace(/\/$/, '')}/${key}`
  }

  async deleteObject(bucket: 'upload' | 'after', key: string): Promise<void> {
    const targetBucket = bucket === 'upload' ? this.uploadBucket : this.afterBucket
    
    if (!targetBucket) {
      throw new Error('R2 bucket not configured')
    }

    await targetBucket.delete(key)
  }
}
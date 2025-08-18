export function adaptArtworkData(oldData: any) {
  return {
    ...oldData,
    // 确保新系统需要的字段存在
    user_state: {
      liked: oldData.user_state?.liked || false,
      faved: oldData.user_state?.faved || false,
    },
    like_count: oldData.like_count || 0,
    fav_count: oldData.fav_count || 0,
  }
}
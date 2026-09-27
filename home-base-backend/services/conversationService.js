const displayNameOf = (user) => {
  if (!user) return 'Guest';
  return user.displayName || (user.email ? user.email.split('@')[0] : '') || 'Guest';
};

// Always send the listing as an object ({ _id, name, images, location }) so the chat page keeps working
const toPayload = async (conversation) => {
  await conversation.populate('listingId', 'name images location');
  const obj = conversation.toObject();
  if (obj.unreadCounts instanceof Map) {
    obj.unreadCounts = Object.fromEntries(obj.unreadCounts);
  }
  return obj;
};

module.exports = { displayNameOf, toPayload };
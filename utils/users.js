const users = [];
//Implement UserName

const userJoin = (socketId, peerId, roomName) => {
  const user = { socketId, peerId, roomName };
  users.push(user);
  return user;
};

const getUserFromPeer = (peerId) => {
  return users.find((user) => user.peerId === peerId);
};
const getUserFromSocket = (socketId) => {
  return users.find((user) => user.socketId === socketId);
};

const getRoomUsers = (roomName) => {
  return users.filter((user) => user.roomName === roomName);
};

export { userJoin, getUserFromPeer, getUserFromSocket, getRoomUsers };

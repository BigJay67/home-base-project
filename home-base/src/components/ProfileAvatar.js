import React from 'react';

function ProfileAvatar({ user, userProfile, size = 32 }) {
  if (userProfile?.profilePicture) {
    return (
      <img
        src={userProfile.profilePicture}
        alt="Profile"
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: '#007bff',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.5,
        fontWeight: 'bold'
      }}
    >
      {user?.displayName ? user.displayName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
    </div>
  );
}

export default ProfileAvatar;
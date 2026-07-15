// Room statuses: 'available' | 'booked' | 'maintenance'
// Sharing types: 'single' | 'double' | 'triple' | 'four'

export const sharingPricing = [
  { type: 'single', label: 'Single Sharing', icon: '👤', price: 10000 },
  { type: 'double', label: 'Double Sharing', icon: '👥', price: 8000 },
  { type: 'triple', label: 'Triple Sharing', icon: '👨‍👩‍👦', price: 6500 },
  { type: 'four', label: 'Four Sharing', icon: '👨‍👩‍👦‍👦', price: 5000 },
];

export function generateRooms(totalFloors, roomsPerFloor = 4) {
  const sharingTypes = ['single', 'double', 'triple', 'four'];
  const statuses = ['available', 'booked', 'maintenance'];
  const rooms = [];

  for (let floor = 1; floor <= totalFloors; floor++) {
    for (let room = 1; room <= roomsPerFloor; room++) {
      const roomNumber = floor * 100 + room;
      const sharingIndex = (room - 1) % sharingTypes.length;
      const sharing = sharingTypes[sharingIndex];
      const pricing = sharingPricing.find(s => s.type === sharing);

      // Deterministic status based on room number for consistency
      const seed = (roomNumber * 7 + floor * 3) % 10;
      let status;
      if (seed < 5) status = 'available';
      else if (seed < 8) status = 'booked';
      else status = 'maintenance';

      rooms.push({
        id: roomNumber,
        roomNumber,
        floor,
        sharing,
        sharingLabel: pricing.label,
        rent: pricing.price,
        status,
        hasAttachedBathroom: room <= 2,
        isAC: room === 1 || room === 4,
        hasBalcony: room === roomsPerFloor,
      });
    }
  }

  return rooms;
}

export function getRoomStats(rooms) {
  const totalFloors = new Set(rooms.map(r => r.floor)).size;
  const totalRooms = rooms.length;
  const available = rooms.filter(r => r.status === 'available').length;
  const booked = rooms.filter(r => r.status === 'booked').length;
  const maintenance = rooms.filter(r => r.status === 'maintenance').length;

  return { totalFloors, totalRooms, available, booked, maintenance };
}

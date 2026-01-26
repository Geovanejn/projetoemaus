export function getFirstAndLastName(fullName: string): string {
  if (!fullName || fullName.trim() === '') {
    return '';
  }

  const parts = fullName.trim().split(/\s+/);
  
  if (parts.length === 1) {
    return parts[0];
  }
  
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  
  return `${firstName} ${lastName}`;
}

export function getFirstName(fullName: string): string {
  if (!fullName || fullName.trim() === '') {
    return '';
  }

  const parts = fullName.trim().split(/\s+/);
  return parts[0];
}

export const formatPhoneNumber = (value: string): string => {
  // 1. Remove all non-numeric characters to get raw input
  const input = value.replace(/\D/g, '');

  if (!input) return '';

  // 2. Handle Russian numbers (Starts with 7 or 8)
  //    Target: +7 (XXX) XXX-XX-XX
  if (input.startsWith('7') || input.startsWith('8')) {
    // Normalize leading 8 to 7
    let nums = input.startsWith('8') ? '7' + input.slice(1) : input;
    
    // Limit to max 11 digits
    nums = nums.slice(0, 11);

    let formatted = '+7';
    if (nums.length > 1) formatted += ' (' + nums.slice(1, 4);
    if (nums.length > 4) formatted += ') ' + nums.slice(4, 7);
    if (nums.length > 7) formatted += '-' + nums.slice(7, 9);
    if (nums.length > 9) formatted += '-' + nums.slice(9, 11);
    
    return formatted;
  }

  // 3. Handle Uzbek numbers (Starts with 998)
  //    Target: +998 XX XXX XX XX
  if (input.startsWith('998')) {
    let nums = input;
    
    // Limit to max 12 digits (3 code + 9 phone)
    nums = nums.slice(0, 12);

    let formatted = '+998';
    if (nums.length > 3) formatted += ' ' + nums.slice(3, 5);
    if (nums.length > 5) formatted += ' ' + nums.slice(5, 8);
    if (nums.length > 8) formatted += ' ' + nums.slice(8, 10);
    if (nums.length > 10) formatted += ' ' + nums.slice(10, 12);

    return formatted;
  }

  // 4. Fallback for other inputs (just add +)
  return '+' + input;
};
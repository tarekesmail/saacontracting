// Convert numbers to words for invoice amounts
export function numberToWords(amount: number): string {
  if (amount === 0) return 'Zero';
  
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];
  
  const scales = ['', 'Thousand', 'Million', 'Billion'];
  
  function convertHundreds(num: number): string {
    let result = '';
    
    if (num >= 100) {
      result += ones[Math.floor(num / 100)] + ' Hundred';
      num %= 100;
      if (num > 0) result += ' ';
    }
    
    if (num >= 20) {
      result += tens[Math.floor(num / 10)];
      num %= 10;
      if (num > 0) result += ' ' + ones[num];
    } else if (num > 0) {
      result += ones[num];
    }
    
    return result;
  }
  
  function convertNumber(num: number): string {
    if (num === 0) return '';
    
    let result = '';
    let scaleIndex = 0;
    
    while (num > 0) {
      const chunk = num % 1000;
      if (chunk !== 0) {
        const chunkWords = convertHundreds(chunk);
        if (scaleIndex > 0) {
          result = chunkWords + ' ' + scales[scaleIndex] + (result ? ' ' + result : '');
        } else {
          result = chunkWords;
        }
      }
      num = Math.floor(num / 1000);
      scaleIndex++;
    }
    
    return result;
  }
  
  // Split into integer and decimal parts
  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);
  
  let result = convertNumber(integerPart);
  
  if (decimalPart > 0) {
    result += ' and ' + convertNumber(decimalPart) + ' Halalas';
  }
  
  return result + ' Saudi Riyals Only';
}

// Alternative simpler version for Arabic context
export function numberToWordsArabic(amount: number): string {
  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);
  
  // For now, return English version with Arabic currency
  let result = numberToWords(integerPart);
  
  if (decimalPart > 0) {
    result = result.replace(' Saudi Riyals Only', '') + ' and ' + numberToWords(decimalPart).replace(' Saudi Riyals Only', '') + ' Halalas Only';
  }
  
  return result.replace('Saudi Riyals', 'Riyal Saudi');
}
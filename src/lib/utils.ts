export function formatDate(dateString: string): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date).replace(',', ' -');
  } catch (e) {
    return dateString;
  }
}

export function toInputDateTime(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (e) {
    return '';
  }
}

export function getErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred';
  
  const message = error instanceof Error ? error.message : String(error);
  
  // Check if it's our JSON error format
  if (message.startsWith('{') && message.endsWith('}')) {
    try {
      const errorInfo = JSON.parse(message);
      if (errorInfo.error) {
        // Map common Firebase errors to user-friendly messages
        const rawError = errorInfo.error.toLowerCase();
        if (rawError.includes('permission-denied') || rawError.includes('insufficient permissions')) {
          return 'Permission Denied: You do not have access to perform this action.';
        }
        if (rawError.includes('network-request-failed') || rawError.includes('offline')) {
          return 'Network Error: Please check your internet connection.';
        }
        if (rawError.includes('not-found')) {
          return 'Error: Requested data was not found.';
        }
        return errorInfo.error;
      }
    } catch (e) {
      // Not valid JSON, fall back to string
    }
  }
  
  return message;
}

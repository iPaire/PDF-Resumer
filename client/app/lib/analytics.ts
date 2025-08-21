// Google Analytics configuration and tracking functions
export const GA_TRACKING_ID = 'G-GY8B3Z98NM';

// Check if Google Analytics is loaded
export const isGALoaded = (): boolean => {
  return typeof window !== 'undefined' && typeof window.gtag !== 'undefined';
};

// Page view tracking
export const pageview = (url: string): void => {
  if (isGALoaded()) {
    window.gtag('config', GA_TRACKING_ID, {
      page_path: url,
    });
  }
};

// Event tracking
export const trackEvent = (
  action: string,
  category: string,
  label?: string,
  value?: number
): void => {
  if (isGALoaded()) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Custom events for the application
export const analyticsEvents = {
  // User authentication events
  userLogin: (method: 'email' | 'google') => 
    trackEvent('login', 'auth', `login_${method}`),
  
  userRegister: (method: 'email' | 'google') => 
    trackEvent('sign_up', 'auth', `register_${method}`),
  
  userLogout: () => 
    trackEvent('logout', 'auth'),

  // PDF processing events
  pdfUpload: (fileSize: number) => 
    trackEvent('pdf_upload', 'pdf_processing', 'file_uploaded', fileSize),
  
  pdfProcessingStarted: () => 
    trackEvent('pdf_processing_started', 'pdf_processing'),
  
  pdfProcessingCompleted: (processingTime: number) => 
    trackEvent('pdf_processing_completed', 'pdf_processing', 'success', processingTime),
  
  pdfProcessingFailed: (error: string) => 
    trackEvent('pdf_processing_failed', 'pdf_processing', error),

  // Summary events
  summaryGenerated: () => 
    trackEvent('summary_generated', 'content_creation'),
  
  summaryDownloaded: () => 
    trackEvent('summary_downloaded', 'content_interaction'),
  
  summaryDeleted: () => 
    trackEvent('summary_deleted', 'content_interaction'),

  // Quiz events
  quizGenerated: (questionCount: number) => 
    trackEvent('quiz_generated', 'content_creation', 'quiz', questionCount),
  
  quizStarted: () => 
    trackEvent('quiz_started', 'engagement'),
  
  quizCompleted: (score: number) => 
    trackEvent('quiz_completed', 'engagement', 'score', score),

  // Course events
  courseCreated: () => 
    trackEvent('course_created', 'content_creation'),
  
  courseViewed: () => 
    trackEvent('course_viewed', 'content_interaction'),

  // Subscription events
  subscriptionUpgrade: (plan: string) => 
    trackEvent('subscription_upgrade', 'monetization', plan),
  
  subscriptionCancel: () => 
    trackEvent('subscription_cancel', 'monetization'),

  // Feature usage
  languageChanged: (language: string) => 
    trackEvent('language_changed', 'settings', language),
  
  fileConverterUsed: () => 
    trackEvent('file_converter_used', 'feature_usage'),

  // Engagement events
  pageView: (pageName: string) => 
    trackEvent('page_view', 'engagement', pageName),
  
  buttonClick: (buttonName: string, location: string) => 
    trackEvent('button_click', 'ui_interaction', `${location}_${buttonName}`),

  // Error tracking
  errorOccurred: (errorType: string, errorMessage: string) => 
    trackEvent('error', 'technical', `${errorType}: ${errorMessage}`),
};

// Enhanced conversion tracking for key business metrics
export const trackConversion = (conversionType: string, value?: number): void => {
  if (isGALoaded()) {
    window.gtag('event', 'conversion', {
      send_to: GA_TRACKING_ID,
      event_category: 'conversion',
      event_label: conversionType,
      value: value,
    });
  }
};

// User properties for better segmentation
export const setUserProperties = (properties: Record<string, string | number>): void => {
  if (isGALoaded()) {
    window.gtag('config', GA_TRACKING_ID, {
      user_properties: properties,
    });
  }
};

// Ecommerce tracking for subscriptions
export const trackPurchase = (
  transactionId: string,
  value: number,
  currency: string,
  items: Array<{
    item_id: string;
    item_name: string;
    category: string;
    quantity: number;
    price: number;
  }>
): void => {
  if (isGALoaded()) {
    window.gtag('event', 'purchase', {
      transaction_id: transactionId,
      value: value,
      currency: currency,
      items: items,
    });
  }
};
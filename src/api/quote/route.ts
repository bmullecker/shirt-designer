/**
 * Mock Backend Route for Quote Submission
 * Simulates an endpoint that would receive the high-res image and trigger an email.
 */

export const submitQuote = async (payload: {
  userEmail: string;
  designImage: string; // Base64 png
  designMetadata: any;
}) => {
  console.log("Mock API /api/quote triggered with payload:", {
    email: payload.userEmail,
    metadata: payload.designMetadata,
    imageSnippet: payload.designImage.substring(0, 50) + '...'
  });

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ status: 200, message: "Quote sent successfully" });
    }, 1500); // 1.5s delay to simulate network latency
  });
};

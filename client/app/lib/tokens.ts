import prisma from "@/lib/prisma";

// Calculate token cost based on pages and subscription
export const calculateTokenCost = (pages: number, subscription: string) => {
  const baseCost = Math.min(pages * 100, 2000);
  return subscription === 'premium' ? Math.floor(baseCost * 0.8) : baseCost;
};

// Check if user has sufficient tokens
export const checkTokenBalance = async (userId: string, cost: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokens: true }
  });
  
  return user && (user.tokens || 0) >= cost;
};

// Deduct tokens from user's balance
export const deductTokens = async (userId: string, cost: number) => {
  await prisma.user.update({
    where: { id: userId },
    data: { 
      tokens: {
        decrement: cost
      }
    }
  });
};

// Add tokens to user's balance
export const addTokens = async (userId: string, amount: number) => {
  await prisma.user.update({
    where: { id: userId },
    data: { 
      tokens: {
        increment: amount
      }
    }
  });
};
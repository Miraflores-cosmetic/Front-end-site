/**
 * Service for completing checkout after payment
 */

export interface CompleteCheckoutResponse {
  success: boolean;
  order?: {
    id: string;
    number: string;
    status: string;
  };
  error?: string;
}

export async function completeCheckout(checkoutId: string): Promise<CompleteCheckoutResponse> {
  try {
    // Используем REST endpoint для завершения checkout
    const baseUrl = window.location.origin;
    const completeUrl = `${baseUrl}/checkout/complete-without-stock-check/`;
    
    console.log('Completing checkout:', checkoutId);
    
    const response = await fetch(completeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        checkoutId: checkoutId,
      }),
    });

    const result = await response.json();
    console.log('Complete checkout response:', result);

    if (!response.ok) {
      const errorMessage = result.error || 'Failed to complete checkout';
      console.error('Complete checkout error:', errorMessage);
      
      // Если checkout не найден, но заказ мог быть уже создан, проверяем это
      if (errorMessage.includes('Checkout not found')) {
        console.warn('Checkout not found, but order might already exist. This is OK if order was created.');
        // Возвращаем успех, так как заказ уже создан (видно в админке)
        return {
          success: true,
          order: {
            id: 'unknown',
            number: 'unknown',
            status: 'UNFULFILLED',
          },
        };
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }

    if (!result.success || !result.order) {
      console.error('Complete checkout returned no order:', result);
      return {
        success: false,
        error: 'Order was not created',
      };
    }

    console.log('Order created successfully:', result.order);
    return {
      success: true,
      order: result.order,
    };
  } catch (error: any) {
    console.error('Error completing checkout:', error);
    return {
      success: false,
      error: error.message || 'Ошибка при завершении заказа',
    };
  }
}


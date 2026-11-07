import React from 'react';
import { Link } from 'react-router-dom';

export function sampleGuestToastMessage(): React.ReactNode {
  return (
    <>
      Пробники доступны только зарегистрированным покупателям.{' '}
      <Link to="/sign-up" style={{ color: 'inherit', textDecoration: 'underline' }}>
        Зарегистрироваться
      </Link>
      {' · '}
      <Link to="/sign-in" style={{ color: 'inherit', textDecoration: 'underline' }}>
        Войти
      </Link>
    </>
  );
}

export function sampleAlreadyPurchasedToastMessage(
  rulesArticleUrl: string,
): React.ReactNode {
  return (
    <>
      Вы уже заказывали этот пробник ранее.{' '}
      <Link to={rulesArticleUrl} style={{ color: 'inherit', textDecoration: 'underline' }}>
        Правила приобретения пробников
      </Link>
    </>
  );
}

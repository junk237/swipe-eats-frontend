"use client";

import { useEffect, useState } from "react";

import { useSearchParams, useRouter } from "next/navigation";

import { useUser } from "@auth0/nextjs-auth0/client";
import { AxiosError } from "axios";
import { NextPage } from "next";

import LoadingScreen from "@/components/base/Loading/LoadingScreen";
import { useSetRestaurantData } from "@/contexts/RestaurantContext";
import { getRestaurantsInfo } from "@/features/swipe/result/api/getRestaurantsInfo";
import CardSwiper from "@/features/swipe/result/components/CardSwiper";
import client from "@/lib/apiClient";
import { RestaurantData } from "@/types/RestaurantData";

import styles from "./page.module.scss";

const ResultPage: NextPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const latitude = parseFloat(searchParams.get("latitude") || "");
  const longitude = parseFloat(searchParams.get("longitude") || "");
  const category = searchParams.get("category") || "";
  const radius = parseInt(searchParams.get("radius") || "100");
  const price = searchParams.get("price") || "";
  const splittedPrice = price ? price.split(",").map(Number) : [];
  const sort = searchParams.get("sort") || "prominence";
  const setRestaurantData = useSetRestaurantData();
  const { user } = useUser();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [restaurants, setRestaurants] = useState<RestaurantData[]>([]);
  const [restaurantsWithDirection, setRestaurantsWithDirection] = useState<
    RestaurantData[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  interface ErrorResponse {
    error: string;
  }

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const res = await getRestaurantsInfo(
          latitude,
          longitude,
          category,
          radius,
          splittedPrice,
          sort
        );
        setRestaurants(res.message);
        setRestaurantsWithDirection(
          res.message.map((restaurant: any) => ({
            ...restaurant,
            direction: "",
          }))
        );
      } catch (error) {
        const axiosError = error as AxiosError<ErrorResponse>;
        if (
          axiosError.response &&
          axiosError.response.data &&
          axiosError.response.data.error
        ) {
          setError(axiosError.response.data.error);
        } else {
          setError("不明なエラーが発生しました。");
        }
      }
      setIsLoading(false);
    };

    if (latitude && longitude) {
      fetchRestaurants();
    } else {
      setError("位置情報がありません。");
    }
  }, []);

  const handleCardSwipe = (index: number, direction: string) => {
    index > 0 && setCurrentIndex(restaurants.length - index);
    setRestaurantsWithDirection((prev) => {
      const updatedRestaurants = [...prev];
      updatedRestaurants[index].direction = direction;
      return updatedRestaurants;
    });
  };

  const sendRestaurantsData = async (restaurants: RestaurantData[]) => {
    if (user) {
      try {
        const tokenResponse = await fetch("/api/token");
        const tokenData = await tokenResponse.json();
        const token = tokenData.accessToken;

        const likedRestaurants = restaurants.filter(
          (r) => r.direction === "right"
        );
        await Promise.all(
          likedRestaurants.map((restaurant) => {
            return client.post(
              "/favorites",
              { placeId: restaurant.placeId },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
          })
        );
      } catch (err) {
        console.error("バックエンドへのデータ送信エラー:", err);
      }
    }
  };

  const handleLastCardSwipe = async () => {
    const reversedRestaurantsWithDirection = [
      ...restaurantsWithDirection,
    ].reverse();
    setRestaurantData({
      restaurantsWithDirection: reversedRestaurantsWithDirection,
      latitude,
      longitude,
      radius,
    });
    sendRestaurantsData(restaurantsWithDirection);
    router.push(`/swipe/map`);
  };

  const handleCardRestore = (index: number) => {
    setCurrentIndex(restaurants.length - index - 1);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        検索結果：
        {restaurants.length > 0 && (
          <span className={styles.resultCount}>
            {restaurants.length}件中 {currentIndex + 1}件目
          </span>
        )}
      </h1>
      {error ? (
        <>
          <div className={styles.error}>
            <p>{error}</p>
          </div>
          <div className={styles.buttons}>
            <button
              className={styles.button}
              onClick={() => router.push(`/swipe/search/?category=${category}`)}
            >
              検索条件を変更
            </button>
          </div>
        </>
      ) : (
        <CardSwiper
          restaurants={restaurants}
          onCardSwipe={handleCardSwipe}
          onLastCardSwipe={handleLastCardSwipe}
          onCardRestore={handleCardRestore}
        />
      )}
    </div>
  );
};

export default ResultPage;

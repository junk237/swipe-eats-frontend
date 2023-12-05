"use client";

import { useEffect, useRef, useState } from "react";

import { GoogleMap, LoadScript } from "@react-google-maps/api";
import { NextPage } from "next";

import ErrorSection from "@/components/base/Error/ErrorSection";
import { useRestaurantData } from "@/contexts/RestaurantContext";
import Directions from "@/features/swipe/map/components/Directions";
import RestaurantInfo from "@/features/swipe/map/components/RestaurantInfo";
import RestaurantListItem from "@/features/swipe/map/components/RestaurantListItem";
import RestaurantMarkers from "@/features/swipe/map/components/RestaurantMarkers";
import SelectedMarker from "@/features/swipe/map/components/SelectedMarker";
import UserMarker from "@/features/swipe/map/components/UserMarker";
import { RestaurantData } from "@/types/RestaurantData";

import styles from "./page.module.scss";

const DEFAULT_CENTER = {
  lat: 35.5649221,
  lng: 139.6559956,
};

const MapPage: NextPage = () => {
  const restaurantData = useRestaurantData();
  const [restaurants, setRestaurants] = useState<RestaurantData[]>(
    restaurantData.restaurants
  );
  const latitude = restaurantData.latitude;
  const longitude = restaurantData.longitude;
  const radius = restaurantData.radius || 500;
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "";
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<null | RestaurantData>(null);
  const [hoveredRestaurant, setHoveredRestaurant] =
    useState<null | RestaurantData>(null);
  const [directionsResult, setDirectionsResult] =
    useState<google.maps.DirectionsResult | null>(null);
  const [travelTime, setTravelTime] = useState<string | null>(null);
  const [previousPlaceId, setPreviousPlaceId] = useState<string | null>(null);
  const [filter, setFilter] = useState("favorites");

  const favoriteCount = restaurants.filter((r) => r.isFavorite === true).length;
  const nullCount = restaurants.filter((r) => r.isFavorite === null).length;
  const allCount = restaurants.filter((r) => r.isFavorite !== false).length;
  const [isHeightOver, setIsHeightOver] = useState(false);
  const [zIndex, setZIndex] = useState(3);

  const visibleRestaurants = restaurants.filter((restaurant) => {
    switch (filter) {
      case "favorites":
        return restaurant.isFavorite === true;
      case "null":
        return restaurant.isFavorite === null;
      case "all":
        return restaurant.isFavorite !== false;
      default:
        return true;
    }
  });

  const visibleRestaurantsLength = restaurants.filter(
    (restaurant) => restaurant.isFavorite !== false
  ).length;

  const center = {
    lat: latitude ?? DEFAULT_CENTER.lat,
    lng: longitude ?? DEFAULT_CENTER.lng,
  };

  const [mapCenter, setMapCenter] = useState(center);

  const containerStyle = {
    width: "100%",
    height: "100%",
  };

  type ZoomLevels = {
    [key: number]: number;
    default: number;
  };

  const ZOOM_LEVELS: ZoomLevels = {
    100: 17,
    500: 16,
    1000: 15,
    2000: 14,
    3000: 13,
    4000: 13,
    5000: 12,
    default: 16,
  };

  const getZoomSize = (radius: number) => {
    return ZOOM_LEVELS[radius] || ZOOM_LEVELS.default;
  };

  const restaurantInfoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const restaurantInfo = restaurantInfoRef.current;

    if (!restaurantInfo) return;

    const scrollAction = () => {
      const currentScrollTop = restaurantInfo.scrollTop;
      const halfWindowHeight = (window.innerHeight - 70) / 2;

      if (isHeightOver) {
        if (currentScrollTop === 0) {
          setIsHeightOver(false);
          setTimeout(() => setZIndex(2), 500);
        }
      } else {
        if (currentScrollTop < halfWindowHeight) {
          setIsHeightOver(true);
          setZIndex(4);
        }
      }
    };
    restaurantInfo.addEventListener("scroll", scrollAction);

    return () => {
      restaurantInfo.removeEventListener("scroll", scrollAction);
    };
  }, [isHeightOver]);

  const handleDirectionsCallback = (
    result: google.maps.DirectionsResult | null,
    status: google.maps.DirectionsStatus
  ) => {
    if (result && status === google.maps.DirectionsStatus.OK) {
      if (!previousPlaceId || previousPlaceId !== selectedRestaurant?.placeId) {
        setDirectionsResult(result);
        setTravelTime(result.routes[0].legs[0].duration?.text || null);
        setPreviousPlaceId(selectedRestaurant?.placeId || null);
      }
    } else {
      setDirectionsResult(null);
      setTravelTime(null);
      setPreviousPlaceId(null);
    }
  };

  if (visibleRestaurantsLength <= 0) {
    return (
      <ErrorSection error={"表示するレストランがありません"} category={null} />
    );
  }

  return (
    <div className={styles.container}>
      <div
        className={styles.restaurantInfo}
        style={{ zIndex: zIndex }}
        ref={restaurantInfoRef}
      >
        <div
          className={`${styles.hiddenContainer} ${
            isHeightOver
              ? styles.scrollHiddenContainerZero
              : styles.scrollHiddenContainerFifty
          }`}
        ></div>

        {!selectedRestaurant && (
          <>
            <div className={styles.buttonContainer}>
              <button
                onClick={() => {
                  setFilter("favorites");
                  setSelectedRestaurant(null);
                }}
                className={`${styles.button} ${
                  filter === "favorites" ? styles.active : ""
                }`}
              >
                お気に入り
                <span>{favoriteCount}か所</span>
              </button>
              <button
                onClick={() => {
                  setFilter("null");
                  setSelectedRestaurant(null);
                }}
                className={`${styles.button} ${
                  filter === "null" ? styles.active : ""
                }`}
              >
                未評価
                <span>{nullCount}か所</span>
              </button>
              <button
                onClick={() => {
                  setFilter("all");
                  setSelectedRestaurant(null);
                }}
                className={`${styles.button} ${
                  filter === "all" ? styles.active : ""
                }`}
              >
                すべて
                <span>{allCount}か所</span>
              </button>
            </div>

            <div className={styles.restaurantList}>
              {visibleRestaurants?.map(
                (restaurant, index) =>
                  restaurant.isFavorite !== false && (
                    <RestaurantListItem
                      key={restaurant.placeId}
                      restaurant={restaurant}
                      setHoveredRestaurant={setHoveredRestaurant}
                      setSelectedRestaurant={setSelectedRestaurant}
                    />
                  )
              )}
            </div>
          </>
        )}
        {selectedRestaurant && (
          <RestaurantInfo
            restaurant={selectedRestaurant}
            setSelectedRestaurant={() => setSelectedRestaurant(null)}
            setDirectionsResult={() => setDirectionsResult(null)}
            setTravelTime={() => setTravelTime(null)}
            setPreviousPlaceId={() => setPreviousPlaceId(null)}
            setRestaurants={setRestaurants}
          />
        )}
      </div>
      <div className={styles.mapContainer}>
        <LoadScript googleMapsApiKey={googleMapsApiKey}>
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={mapCenter}
            zoom={getZoomSize(radius)}
          >
            <UserMarker
              center={center}
              radius={radius}
              travelTime={travelTime}
            />
            <RestaurantMarkers
              restaurants={visibleRestaurants}
              selectedRestaurant={selectedRestaurant}
              hoveredRestaurant={hoveredRestaurant}
              setHoveredRestaurant={setHoveredRestaurant}
              setSelectedRestaurant={setSelectedRestaurant}
            />
            <SelectedMarker
              selectedRestaurant={selectedRestaurant}
              setHoveredRestaurant={setHoveredRestaurant}
            />
            <Directions
              center={center}
              selectedRestaurant={selectedRestaurant}
              directionsResult={directionsResult}
              handleDirectionsCallback={handleDirectionsCallback}
            />
          </GoogleMap>
        </LoadScript>
      </div>
    </div>
  );
};
export default MapPage;

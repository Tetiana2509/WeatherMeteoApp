import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ViewProps,
  ActivityIndicator,
} from "react-native";
import { useLocation, useCurrentLocation } from "../hooks/useLocation";
import { Ionicons } from "@expo/vector-icons";
import { Coords } from "./WeatherTypes";

type Props = ViewProps & {
  coords?: Coords | null;
  onCoordsChange: (coords: Coords | null) => void;
};

export default function LocationInput({ coords, onCoordsChange, ...viewProps }: Props) {
  const [location, setLocation] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [hasInitialized, setHasInitialized] = useState(false);
  const [shouldUseCurrentLocation, setShouldUseCurrentLocation] = useState(false);

  const { coords: locationCoords, status } = useLocation(location);
  const currentLocationCoords = useCurrentLocation();

  // Initialize input value from coords prop if provided
  useEffect(() => {
    if (coords?.displayName && !inputValue && !hasInitialized) {
      setInputValue(coords.displayName);
      setHasInitialized(true);
    }
  }, [coords, inputValue, hasInitialized]);

  // Update parent when coords change
  useEffect(() => {
    const newCoords = locationCoords || (shouldUseCurrentLocation ? currentLocationCoords : null);
    onCoordsChange(newCoords);
  }, [locationCoords, currentLocationCoords, shouldUseCurrentLocation, onCoordsChange]);

  // Update input when using current location coordinates - only on initial load
  useEffect(() => {
    if (!hasInitialized && shouldUseCurrentLocation && currentLocationCoords?.displayName && !inputValue) {
      setInputValue(currentLocationCoords.displayName);
      setHasInitialized(true);
    }
  }, [currentLocationCoords, shouldUseCurrentLocation, inputValue, hasInitialized]);

  // Update input value when location is resolved from search
  useEffect(() => {
    if (locationCoords?.displayName && locationCoords.displayName !== inputValue) {
      setInputValue(locationCoords.displayName);
    }
  }, [locationCoords?.displayName]);

  const handleGeolocation = () => {
    if (currentLocationCoords?.displayName) {
      setLocation("");
      setInputValue(currentLocationCoords.displayName);
      setShouldUseCurrentLocation(true);
    }
  };

  const handleSearch = () => {
    setLocation(inputValue);
    setShouldUseCurrentLocation(false);
  };

  const handleClear = () => {
    setInputValue("");
    setLocation("");
    setShouldUseCurrentLocation(false);
  };

  const isLoading = status === "loading";

  return (
    <View {...viewProps}>
      <View style={styles.searchContainer}>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, isLoading && styles.inputDisabled]}
            placeholder="City, country or postal code"
            value={inputValue}
            onChangeText={setInputValue}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            editable={!isLoading}
          />
          {isLoading ? (
            <ActivityIndicator 
              size="small" 
              color="#666" 
              style={styles.activityIndicator} 
            />
          ) : (
            inputValue.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClear}
                accessibilityRole="button"
                accessibilityLabel="Clear input"
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )
          )}
        </View>
        <View style={styles.iconsContainer}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleGeolocation}
            accessibilityRole="button"
            accessibilityLabel="Use my location"
          >
            <Ionicons name="location" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {status && status !== "loading" && (
        <Text style={styles.error}>
          {status}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  inputContainer: {
    flex: 1,
    position: "relative",
    marginRight: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingRight: 40, // Space for clear button
    height: 44,
    backgroundColor: "#fff",
  },
  inputDisabled: {
    backgroundColor: "#f5f5f5",
    color: "#999",
  },
  clearButton: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: [{ translateY: -10 }], // Half of icon size for perfect centering
    padding: 2,
  },
  activityIndicator: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: [{ translateY: -10 }],
  },
  iconsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    backgroundColor: "#2C2C2E",
    padding: 10,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
    marginLeft: 6,
  },
  error: {
    color: "red",
    textAlign: "center",
  },
});

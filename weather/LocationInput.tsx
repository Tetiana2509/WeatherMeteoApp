import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ViewProps,
  ActivityIndicator,
} from 'react-native';
import { useLocation, useCurrentLocation } from './hooks/useLocation';
import { Ionicons } from '@expo/vector-icons';
import { Coords } from './types';

type Props = ViewProps & {
  coords?: Coords | null;
  onCoordsChange: (coords: Coords | null) => void;
};

export function LocationInput({ coords, onCoordsChange, ...viewProps }: Props) {
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setInputValue(coords?.displayName ?? '');
    setSearchQuery('');
  }, [coords]);

  const { coords: searchCoords, status } = useLocation(searchQuery);
  useEffect(() => {
    if (searchCoords) {
      onCoordsChange(searchCoords);
    }
  }, [searchCoords, onCoordsChange]);

  const currentLocationCoords = useCurrentLocation();
  const handleGeolocation = () => {
    if (currentLocationCoords) {
      onCoordsChange(currentLocationCoords);
    }
  };

  const handleSearch = () => {
    setSearchQuery(inputValue);
  };

  const handleClear = () => {
    onCoordsChange(null);
  };

  const isLoading = status === 'loading';

  return (
    <View {...viewProps}>
      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.input, isLoading && styles.inputDisabled]}
          placeholder="City, country or postal code"
          placeholderTextColor="#999"
          value={inputValue}
          onChangeText={setInputValue}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          editable={!isLoading}
        />
        <View style={styles.buttonsContainer}>
          {isLoading ? (
            <ActivityIndicator
              size="small"
              color="#666"
            />
          ) : (
            <>
              {inputValue.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={handleClear}
                  accessibilityRole="button"
                  accessibilityLabel="Clear input"
                >
                  <Ionicons name="close-circle" size={22} color="#888" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.locationButton}
                onPress={handleGeolocation}
                accessibilityRole="button"
                accessibilityLabel="Use my location"
              >
                <Ionicons name="location" size={22} color="#888" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {status && status !== 'loading' && (
        <Text style={styles.error}>
          {status}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    backgroundColor: '#fff',
    height: 44,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    marginRight: 8,
    fontSize: 16,
    color: '#000',
  },
  inputDisabled: {
    color: '#999',
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  locationButton: {
    padding: 6,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: 'red',
    textAlign: 'center',
  },
});

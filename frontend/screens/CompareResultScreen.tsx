import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Keyboard,
  ActivityIndicator,
  Dimensions,
  Platform,
  Animated,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, NavigationProp, useRoute, RouteProp } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import Footer from '../components/Footer';
import Header from '../components/Header';
import { useLocation } from '../contexts/LocationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCart } from '../contexts/CartContext';
import { RootStackParamList } from '../navigation/AppNavigator';

// Import shop logos
const shopLogos: { [key: string]: ImageSourcePropType } = {
  blinkit: require('../assets/logos/blinkit.png'),
  instamart: require('../assets/logos/instamart.png'),
  bigbasket: require('../assets/logos/bigbasket.png'),
  dmart: require('../assets/logos/d-mart.png'),
  zepto: require('../assets/logos/zepto.png'),
};

interface CompareResultItem {
  id: string;
  image: string;
  name: string;
  quantity: string;
  shops: {
    name: string;
    price: string;
    link: string;
    quantity: string;
  }[];
}

const STORAGE_CRED_KEY = 'Pricely-credentials';

// Helper function to generate a unique ID for a specific shop entry in the cart
const generateCartItemId = (item: CompareResultItem, shop: { name: string; price: string; quantity: string; link: string }): string => {
  // Use item's original index ID, shop name, price, and quantity for uniqueness
  return `${item.id}-${shop.name}-${shop.price}-${shop.quantity}`;
};

const ComparisonCard: React.FC<{
  item: CompareResultItem;
  opacity: Animated.Value;
  // Update prop type to accept the shop object
  onAddToCart: (item: CompareResultItem, shop: { name: string; price: string; quantity: string; link: string }, remove: boolean) => void;
  isInCart: (cartItemId: string) => boolean;
  style?: any;
}> = ({ item, opacity, onAddToCart, isInCart, style }) => {
  const displayQuantity = item.shops.length > 0 ? item.shops[0].quantity : item.quantity;
  // Pass the full shop object to generateCartItemId
  const areAllItemsInCart = item.shops.every(shop => {
    const cartItemId = generateCartItemId(item, shop);
    const inCart = isInCart(cartItemId);
    console.log(`[DEBUG] Checking if in cart: ID=${cartItemId}, Result=${inCart}`);
    return inCart;
  });

  const handleAddAllItems = () => {
    console.log(`[DEBUG] handleAddAllItems triggered for item ${item.id} (${item.name})`);
    console.log(`[DEBUG] Current areAllItemsInCart: ${areAllItemsInCart}`);
    const shouldRemove = areAllItemsInCart;
    item.shops.forEach(shop => {
      const cartItemId = generateCartItemId(item, shop);
      console.log(`[DEBUG] Bulk ${shouldRemove ? 'removing' : 'adding'} item with ID=${cartItemId}`);
      onAddToCart(item, shop, shouldRemove);
    });
  };

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity,
          transform: [{
            translateY: opacity.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0]
            })
          }]
        },
        style
      ]}
    >
      <LinearGradient
        colors={['#ffffff', '#ffffff']}
        style={[styles.cardGradient, { padding: Dimensions.get('window').width * 0.02 }]}
      >
        <Image source={{ uri: item.image }} style={styles.image} resizeMode="contain" />
        <View style={styles.cardContent}>
          <View style={styles.topContent}>
            <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
            <View style={styles.shopsContainer}>
              {item.shops.map((shop, index) => {
                // Generate the unique ID for this specific shop entry
                const cartItemId = generateCartItemId(item, shop);
                return (
                  <View key={index} style={styles.shopItem}>
                    <Image
                      source={getShopLogo(shop.name)}
                      style={styles.shopIcon}
                      resizeMode="contain"
                    />
                  <View style={styles.priceContainer}>
                    <Text style={styles.price}>₹{shop.price}</Text>
                    <Text style={styles.shopQuantity}>{shop.quantity}</Text>
                  </View>
                  {isInCart(cartItemId) ? (
                    <TouchableOpacity
                      // Pass the specific shop object to onAddToCart
                      onPress={() => onAddToCart(item, shop, true)}
                      style={styles.button}
                    >
                      <LinearGradient
                        colors={['#ff6b6b', '#ee5253']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.buttonGradient}
                      >
                        <Ionicons name="remove" size={16} color="#fff" />
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      // Pass the specific shop object to onAddToCart
                      onPress={() => onAddToCart(item, shop, false)}
                      style={styles.button}
                    >
                      <LinearGradient
                        colors={['#2ecc71', '#27ae60']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.buttonGradient}
                      >
                        <Ionicons name="add" size={16} color="#fff" />
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                  </View>
                );
              })}
            </View>
          </View>
          <View style={styles.bottomContent}>
            <TouchableOpacity
              style={styles.addAllButton}
              onPress={handleAddAllItems}
            >
              <LinearGradient
                colors={areAllItemsInCart ? ['#ff6b6b', '#ee5253'] : ['#4c669f', '#3b5998', '#192f6a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.addAllButtonGradient}
              >
                <Text style={styles.addAllButtonText}>
                  {/* {areAllItemsInCart ? 'Remove all items' : 'Add all items'} */}
                  {/* Temporarily disable Add/Remove All until logic is verified */}
                  Add/Remove Items Above
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const getShopLogo = (shopName: string): ImageSourcePropType => {
  const key = shopName.toLowerCase();
  return shopLogos[key] || shopLogos['bigbasket']; // fallback to bigbasket if logo not found
};

export default function CompareResultScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CompareResult'>>();
  const { currentLocation, updateLocation, autoLocate } = useLocation();
  const { addToCart, removeFromCart, isInCart } = useCart();
  const [compareData, setCompareData] = useState<CompareResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const searchId = route.params?.query || Date.now().toString();
  const [error, setError] = useState<string | null>(null);
  const [fadeAnims] = useState<Animated.Value[]>([]);
  const [activeTab, setActiveTab] = useState('');

  useEffect(() => {
    console.log('Initiating comparison data fetch...');
    fetchComparisonData().catch(err => {
      console.error('Failed to fetch comparison data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setLoading(false);
    });
  }, [route.params?.query]); // Re-fetch when search query changes

  useEffect(() => {
    if (compareData.length > 0 && route.params?.onSearchComplete) {
      const firstProductImage = compareData[0].image;
      route.params.onSearchComplete(firstProductImage);
    }
  }, [compareData, route.params?.onSearchComplete]);

  const fetchComparisonData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get coordinates from AsyncStorage
      const lat = await AsyncStorage.getItem('pricely_lat') || '22.6382939';
      const lon = await AsyncStorage.getItem('pricely_lon') || '88.448261';
      const item_name = route.params?.query || '';

      // Get stored credentials if they exist
      const storedCredentialsJson = await AsyncStorage.getItem(STORAGE_CRED_KEY);
      let storedCredentials = null;
      
      if (storedCredentialsJson) {
        storedCredentials = JSON.parse(storedCredentialsJson);
        // Verify if stored credentials match current location
        if (storedCredentials.lat === lat && storedCredentials.lon === lon) {
          console.log('Using stored credentials for location:', lat, lon);
        } else {
          console.log('Location mismatch, not using stored credentials');
          storedCredentials = null;
        }
      }

      // Prepare request payload
      const payload = {
        item_name,
        lat,
        lon,
        credentials: storedCredentials
      };

      // Make API call
      const response = await fetch('https://noble-raven-entirely.ngrok-free.app/get-search-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const result = await response.json();
      console.log('API Response:', JSON.stringify(result, null, 2));

      console.log('Parsed response:', JSON.stringify(result.data.credentials));

      // If the stored location is not matching then send null as credentials and after we get new credentials then we store the new credentials in the local storage and send the new credentials to the server
      // Check if credentials are present in the response and check if the location (lat,lon,address) is matching with the already stored location then
      // use the already stored credentials in the local storage and send the credentials to the server

      // Check if credentials are present in the response
      if (result.data?.credentials) {
        try {
          // Compare the received credentials with what we sent
          const receivedCredentials = result.data.credentials;
          console.log('Received new credentials from server', receivedCredentials);

          // If we didn't send credentials or received new ones, store them
          if (!payload.credentials || JSON.stringify(payload.credentials) !== JSON.stringify(receivedCredentials)) {
            await AsyncStorage.setItem(STORAGE_CRED_KEY, JSON.stringify({
              ...receivedCredentials,
              lat,
              lon
            }));
            console.log('Stored new credentials with location info',receivedCredentials);

            // Update location context if needed
            if (receivedCredentials.address &&
                (!currentLocation || currentLocation.address !== receivedCredentials.address)) {
              updateLocation({
                address: receivedCredentials.address,
                lat: parseFloat(lat),
                lon: parseFloat(lon)
              });
              console.log('Updated location context with new address');
            }
          } else {
            console.log('Using existing credentials, no updates needed');
          }
        } catch (error) {
          console.error('Error handling credentials:', error);
          setError('Error handling credentials. Please try again.');
        }
      } else {
        console.log('No credentials received from server');
      }
      

      if (!result.data?.data || !Array.isArray(result.data.data)) {
        throw new Error('Invalid response format: expected data.data array');
      }

      // Transform API response to match expected format
      const transformedData = result.data.data.map((item: any, index: number) => {
        if (!item) {
          console.error('Invalid item format:', item);
          return null;
        }

        // Create shops array from price array
        const shops = (item.price || []).map((priceData: any) => ({
          name: priceData.store.toLowerCase(),
          price: priceData.price.toString(),
          link: priceData.url,
          quantity: priceData.quantity
        }));

        return {
          id: index.toString(),
          image: item.image,
          name: item.name,
          quantity: shops[0]?.quantity || '', // Use quantity from first price entry
          shops: shops
        };
      }).filter(Boolean);

      if (transformedData.length === 0) {
        throw new Error('No valid items found in response');
      }

      setCompareData(transformedData);
    } catch (err) {
      console.error('Error fetching comparison data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Updated handleCartAction to accept the specific shop object
  const handleCartAction = (
    item: CompareResultItem,
    shop: { name: string; price: string; quantity: string; link: string },
    remove: boolean
  ) => {
    const cartItemId = generateCartItemId(item, shop); // Generate ID based on specific shop entry
    const shopName = shop.name; // Extract shopName for convenience

    console.log(`[DEBUG] handleCartAction called for item ${item.id} (${item.name}), shop=${shopName}, remove=${remove}`);
    console.log(`[DEBUG] CartItemId=${cartItemId}`);

    if (remove) {
      console.log(`[DEBUG] Removing item with ID=${cartItemId}`);
      removeFromCart(cartItemId); // Use the specific ID to remove
      Toast.show({
        type: 'info',
        text1: 'Removed from Cart', // Keep Toast messages concise
        text2: `${item.name} (${shop.quantity}) from ${shopName} removed.`,
        position: 'bottom',
        visibilityTime: 2000,
      });
    } else {
      // Capitalize shop name to match Cart screen's vendor names
      let capitalizedShopName = shopName.charAt(0).toUpperCase() + shopName.slice(1);
      if (capitalizedShopName === "Dmart") capitalizedShopName = "DMart";
      else if (capitalizedShopName === "Bigbasket") capitalizedShopName = "BigBasket";
      // Add other capitalizations if needed (e.g., Instamart)

      console.log(`[DEBUG] Adding item with ID=${cartItemId}`);
      addToCart({
        id: cartItemId, // Use the generated unique ID
        name: item.name,
        image: item.image,
        quantity: shop.quantity, // Use quantity from the specific shop entry
        shopName: capitalizedShopName,
        price: shop.price, // Use price from the shop object
        url: shop.link, // Use link from the specific shop entry
        // searchId is no longer needed in the cart item itself
      });
      Toast.show({
        type: 'success',
        text1: 'Added to Cart', // Keep Toast messages concise
        text2: `${item.name} (${shop.quantity}) from ${shopName} added.`,
        position: 'bottom',
        visibilityTime: 2000,
      });
    }
  };

  const renderComparisonPairs = () => {
    const pairs = [];
    for (let i = 0; i < compareData.length; i += 2) {
      const firstCard = compareData[i];
      const secondCard = i + 1 < compareData.length ? compareData[i + 1] : null;
      
      // Calculate dynamic height based on number of shops
      const firstCardShops = firstCard.shops.length;
      const secondCardShops = secondCard ? secondCard.shops.length : 0;
      const maxShops = Math.max(firstCardShops, secondCardShops);
      
      // Calculate dynamic height based on content
      const baseHeight = Dimensions.get('window').height;
      const imageHeight = Dimensions.get('window').width * 0.25;
      const imageMargin = baseHeight * 0.01;
      const headerHeight = baseHeight * 0.04;
      const shopItemHeight = baseHeight * 0.05;
      const shopMargin = baseHeight * 0.005;
      const bottomButtonHeight = baseHeight * 0.04;
      const padding = baseHeight * 0.05;
      
      // Calculate total height including gaps between shop items
      const shopsHeight = (maxShops * shopItemHeight) + ((maxShops - 1) * shopMargin);
      const contentHeight = headerHeight + shopsHeight + bottomButtonHeight + (padding * 2);
      const totalHeight = imageHeight + imageMargin + contentHeight;
      
      const cardStyle = {
        height: totalHeight,
        backgroundColor: '#ffffff',
        paddingBottom: baseHeight * 0.01
      };

      pairs.push(
        <View key={`pair-${i}`} style={styles.comparePair}>
          <ComparisonCard
            item={compareData[i]}
            opacity={fadeAnims[i] || new Animated.Value(1)} // Animation logic remains
            onAddToCart={handleCartAction} // Pass the updated handler
            isInCart={isInCart}
            // searchId prop removed
            style={cardStyle}
          />
          {i + 1 < compareData.length && (
            <ComparisonCard
              item={compareData[i + 1]}
              opacity={fadeAnims[i + 1] || new Animated.Value(1)} // Animation logic remains
              onAddToCart={handleCartAction} // Pass the updated handler
              isInCart={isInCart}
              // searchId prop removed
              style={cardStyle}
            />
          )}
        </View>
      );
    }
    return pairs;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        userName="Demo"
        currentLocation={currentLocation || { address: 'Select Location' }}
        onLocationSelect={updateLocation}
        onAutoLocate={autoLocate}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.messageContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.message}>Loading...</Text>
          </View>
        ) : error ? (
          <View style={styles.messageContainer}>
            <Text style={[styles.message, styles.error]}>{error}</Text>
          </View>
        ) : compareData.length === 0 ? (
          <View style={styles.messageContainer}>
            <Text style={styles.message}>No results found</Text>
          </View>
        ) : (
          <View style={styles.cardContainer}>
            {renderComparisonPairs()}
          </View>
        )}
      </ScrollView>
      <Footer navigation={navigation} activeTab={activeTab} setActiveTab={setActiveTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'snow',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  cardContainer: {
    width: '100%',
  },
  comparePair: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  card: {
    width: Dimensions.get('window').width * 0.45,
    backgroundColor: 'white',
    borderRadius: Dimensions.get('window').width * 0.035,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.15)',
        shadowOffset: { width: 1, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  cardGradient: {
    backgroundColor: 'white',
    flexDirection: 'column',
    flex: 1,
    height: '100%',
  },
  image: {
    width: '75%',
    height: Dimensions.get('window').width * 0.25,
    alignSelf: 'center',
    borderRadius: Dimensions.get('window').width * 0.02,
    backgroundColor: '#ffffff',
    marginVertical: Dimensions.get('window').height * 0.01,
    resizeMode: 'contain',
  },
  cardContent: {
    padding: Dimensions.get('window').width * 0.025,
    paddingTop: Dimensions.get('window').height * 0.01,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: Dimensions.get('window').height * 0.006,
  },
  topContent: {
    flex: 1,
  },
  bottomContent: {
    paddingTop: Dimensions.get('window').height * 0.008,
    paddingBottom: Dimensions.get('window').height * 0.008,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    backgroundColor: 'white',
  },
  name: {
    fontFamily: 'Poppins',
    fontSize: Dimensions.get('window').width * 0.034,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: Dimensions.get('window').height * 0.004,
    lineHeight: Dimensions.get('window').width * 0.042,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.03)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  quantity: {
    fontFamily: 'Poppins',
    fontSize: Dimensions.get('window').width * 0.03,
    color: '#666',
    marginBottom: Dimensions.get('window').height * 0.006,
    fontWeight: '500',
    opacity: 0.9,
  },
  shopsContainer: {
    flexDirection: 'column',
    gap: Dimensions.get('window').height * 0.005,
    marginTop: Dimensions.get('window').height * 0.008,
    marginBottom: Dimensions.get('window').height * 0.004,
  },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Dimensions.get('window').height * 0.006,
    minHeight: Dimensions.get('window').height * 0.05,
    backgroundColor: '#ffffff',
    borderRadius: 6,
  },
  shopIcon: {
    width: Dimensions.get('window').width * 0.05,
    height: Dimensions.get('window').width * 0.05,
    marginRight: Dimensions.get('window').width * 0.01,
    flexShrink: 0,
    opacity: 1,
  },
  priceContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    flexGrow: 1,
    paddingHorizontal: Dimensions.get('window').width * 0.01,
  },
  price: {
    fontFamily: 'Poppins',
    fontSize: Dimensions.get('window').width * 0.032,
    fontWeight: '700',
    color: '#2ecc71',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(46,204,113,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  shopQuantity: {
    fontFamily: 'Poppins',
    fontSize: Dimensions.get('window').width * 0.026,
    color: '#666',
    marginTop: 2,
    opacity: 0.9,
  },
  button: {
    overflow: 'hidden',
    borderRadius: Dimensions.get('window').width * 0.016,
    marginLeft: Dimensions.get('window').width * 0.015,
    flexShrink: 0,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.12)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  buttonGradient: {
    paddingVertical: Dimensions.get('window').width * 0.012,
    paddingHorizontal: Dimensions.get('window').width * 0.012,
    alignItems: 'center',
    justifyContent: 'center',
    width: Dimensions.get('window').width * 0.06,
    height: Dimensions.get('window').width * 0.06,
    borderRadius: Dimensions.get('window').width * 0.012,
  },
  buttonText: {
    fontFamily: 'Poppins',
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  messageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginTop: 24,
  },
  message: {
    fontFamily: 'Poppins',
    fontSize: 18,
    color: '#333',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  error: {
    color: '#ff6b6b',
    opacity: 0.9,
  },
  title: {
    fontFamily: 'ARCHIVE',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 16,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  addAllButton: {
    borderRadius: Dimensions.get('window').width * 0.02,
    overflow: 'hidden',
    marginTop: Dimensions.get('window').height * 0.008,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.15)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  addAllButtonGradient: {
    paddingVertical: Dimensions.get('window').height * 0.01,
    paddingHorizontal: Dimensions.get('window').width * 0.03,
    alignItems: 'center',
    justifyContent: 'center',
    height: Dimensions.get('window').height * 0.042,
  },
  addAllButtonText: {
    fontFamily: 'Poppins',
    fontSize: Dimensions.get('window').width * 0.032,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
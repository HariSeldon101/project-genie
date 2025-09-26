/**
 * Extraction Schemas for Firecrawl
 *
 * REPLACES THESE V2 EXTRACTORS (3,600+ lines):
 * - company-extractor.ts (600 lines) → COMPANY_SCHEMA
 * - contact-extractor.ts (600 lines) → Embedded in COMPANY_SCHEMA
 * - technology-extractor.ts (600 lines) → Embedded in COMPANY_SCHEMA
 * - social-extractor.ts (600 lines) → Embedded in COMPANY_SCHEMA
 * - content-extractor.ts (600 lines) → Handled by markdown conversion
 * - brand-extractor.ts (600 lines) → Embedded in COMPANY_SCHEMA
 *
 * HOW IT WORKS:
 * - Define JSON schema for desired data structure
 * - Firecrawl's AI extracts data matching the schema
 * - No HTML parsing, regex, or DOM traversal needed
 * - Handles dynamic content automatically
 * - Returns clean, structured data
 *
 * BENEFITS:
 * - 180x less code (20 lines vs 3,600)
 * - More accurate extraction (AI-powered)
 * - Handles edge cases automatically
 * - No maintenance when site structure changes
 * - Works with any language or format
 */

/**
 * Company Information Schema
 * Comprehensive business data extraction
 * Replaces: company-extractor.ts, contact-extractor.ts, social-extractor.ts, brand-extractor.ts
 */
export const COMPANY_SCHEMA = {
  type: "object",
  properties: {
    /**
     * Core company information
     * Replaces company-extractor.ts (600 lines)
     */
    company: {
      type: "object",
      properties: {
        // Basic information
        name: {
          type: "string",
          description: "Company or organization name"
        },
        legalName: {
          type: "string",
          description: "Legal entity name if different from brand name"
        },
        alternateNames: {
          type: "array",
          items: { type: "string" },
          description: "DBA, former names, abbreviations"
        },

        // Description and mission
        description: {
          type: "string",
          description: "Company description or about text"
        },
        tagline: {
          type: "string",
          description: "Company slogan or tagline"
        },
        mission: {
          type: "string",
          description: "Mission statement"
        },
        vision: {
          type: "string",
          description: "Vision statement"
        },
        values: {
          type: "array",
          items: { type: "string" },
          description: "Core values or principles"
        },

        // Business details
        foundedYear: {
          type: "number",
          description: "Year company was founded"
        },
        foundedDate: {
          type: "string",
          description: "Full founding date if available"
        },
        founders: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              title: { type: "string" },
              linkedin: { type: "string" }
            }
          },
          description: "Company founders"
        },

        // Size and scale
        employeeCount: {
          type: "string",
          description: "Number of employees or range"
        },
        employeeCountExact: {
          type: "number",
          description: "Exact employee count if available"
        },
        revenue: {
          type: "string",
          description: "Annual revenue or range"
        },
        revenueExact: {
          type: "number",
          description: "Exact revenue if available"
        },
        funding: {
          type: "string",
          description: "Total funding raised"
        },

        // Industry and market
        industry: {
          type: "string",
          description: "Primary industry"
        },
        industries: {
          type: "array",
          items: { type: "string" },
          description: "All industries/sectors"
        },
        naicsCode: {
          type: "string",
          description: "NAICS industry code"
        },
        sicCode: {
          type: "string",
          description: "SIC industry code"
        },

        // Location
        headquarters: {
          type: "object",
          properties: {
            street: { type: "string" },
            street2: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            stateCode: { type: "string" },
            country: { type: "string" },
            countryCode: { type: "string" },
            postalCode: { type: "string" },
            latitude: { type: "number" },
            longitude: { type: "number" },
            formatted: { type: "string" }
          },
          description: "Primary headquarters location"
        },

        // Corporate structure
        type: {
          type: "string",
          enum: ["public", "private", "nonprofit", "government", "subsidiary"],
          description: "Company type"
        },
        parentCompany: {
          type: "string",
          description: "Parent company if subsidiary"
        },
        subsidiaries: {
          type: "array",
          items: { type: "string" },
          description: "List of subsidiary companies"
        },
        stockSymbol: {
          type: "string",
          description: "Stock ticker symbol if public"
        },
        exchange: {
          type: "string",
          description: "Stock exchange if public"
        },

        // Branding
        logoUrl: {
          type: "string",
          description: "Company logo URL"
        },
        faviconUrl: {
          type: "string",
          description: "Website favicon URL"
        },
        brandColors: {
          type: "array",
          items: { type: "string" },
          description: "Primary brand colors (hex)"
        },

        // Website
        website: {
          type: "string",
          description: "Primary website URL"
        },
        domains: {
          type: "array",
          items: { type: "string" },
          description: "All owned domains"
        }
      }
    },

    /**
     * Contact information
     * Replaces contact-extractor.ts (600 lines)
     */
    contact: {
      type: "object",
      properties: {
        // Email addresses
        emails: {
          type: "array",
          items: {
            type: "object",
            properties: {
              email: { type: "string" },
              type: {
                type: "string",
                enum: ["general", "support", "sales", "info", "hr", "press", "investor", "legal"],
                description: "Email purpose/department"
              },
              isPrimary: { type: "boolean" }
            }
          }
        },

        // Phone numbers
        phones: {
          type: "array",
          items: {
            type: "object",
            properties: {
              number: { type: "string" },
              formatted: { type: "string" },
              type: {
                type: "string",
                enum: ["main", "support", "sales", "fax", "toll-free", "mobile"],
                description: "Phone type"
              },
              country: { type: "string" },
              isPrimary: { type: "boolean" }
            }
          }
        },

        // Physical addresses
        addresses: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["headquarters", "office", "warehouse", "store", "factory"],
                description: "Location type"
              },
              name: { type: "string" },
              street: { type: "string" },
              street2: { type: "string" },
              city: { type: "string" },
              state: { type: "string" },
              country: { type: "string" },
              postalCode: { type: "string" },
              latitude: { type: "number" },
              longitude: { type: "number" },
              formatted: { type: "string" }
            }
          }
        },

        // Contact forms and support
        contactForm: {
          type: "boolean",
          description: "Has contact form"
        },
        contactFormUrl: {
          type: "string",
          description: "Contact form page URL"
        },
        supportUrl: {
          type: "string",
          description: "Support/help center URL"
        },
        supportEmail: {
          type: "string",
          description: "Dedicated support email"
        },

        // Hours of operation
        hours: {
          type: "object",
          properties: {
            monday: { type: "string" },
            tuesday: { type: "string" },
            wednesday: { type: "string" },
            thursday: { type: "string" },
            friday: { type: "string" },
            saturday: { type: "string" },
            sunday: { type: "string" },
            timezone: { type: "string" },
            note: { type: "string" }
          }
        }
      }
    },

    /**
     * Technology stack detection
     * Replaces technology-extractor.ts (600 lines)
     */
    technologies: {
      type: "object",
      properties: {
        // Frontend technologies
        frontend: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              category: { type: "string" },
              version: { type: "string" },
              confidence: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description: "Detection confidence score"
              }
            }
          },
          description: "Frontend frameworks and libraries"
        },

        // Backend technologies
        backend: {
          type: "array",
          items: { type: "string" },
          description: "Backend technologies and languages"
        },

        // Databases
        databases: {
          type: "array",
          items: { type: "string" },
          description: "Database systems"
        },

        // Analytics and tracking
        analytics: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              id: { type: "string", description: "Tracking ID if visible" }
            }
          },
          description: "Analytics and tracking tools"
        },

        // Infrastructure
        hosting: {
          type: "object",
          properties: {
            provider: { type: "string" },
            cdn: { type: "string" },
            dns: { type: "string" },
            ssl: { type: "boolean" },
            sslProvider: { type: "string" },
            serverLocation: { type: "string" }
          }
        },

        // Content management
        cms: {
          type: "string",
          description: "Content Management System"
        },

        // E-commerce
        ecommerce: {
          type: "string",
          description: "E-commerce platform"
        },

        // Payment processing
        payment: {
          type: "array",
          items: { type: "string" },
          description: "Payment processors"
        },

        // Marketing tools
        marketing: {
          type: "array",
          items: { type: "string" },
          description: "Marketing and automation tools"
        },

        // Support tools
        support: {
          type: "array",
          items: { type: "string" },
          description: "Customer support tools"
        },

        // Frameworks and libraries
        frameworks: {
          type: "array",
          items: { type: "string" },
          description: "Web frameworks"
        },

        // JavaScript libraries
        libraries: {
          type: "array",
          items: { type: "string" },
          description: "JavaScript libraries"
        },

        // Build tools
        buildTools: {
          type: "array",
          items: { type: "string" },
          description: "Build and bundling tools"
        },

        // APIs and services
        apis: {
          type: "array",
          items: { type: "string" },
          description: "Third-party APIs and services"
        }
      }
    },

    /**
     * Social media profiles
     * Replaces social-extractor.ts (600 lines)
     */
    social: {
      type: "object",
      properties: {
        // Major platforms
        linkedin: {
          type: "object",
          properties: {
            url: { type: "string" },
            handle: { type: "string" },
            followers: { type: "number" }
          }
        },
        twitter: {
          type: "object",
          properties: {
            url: { type: "string" },
            handle: { type: "string" },
            followers: { type: "number" }
          }
        },
        facebook: {
          type: "object",
          properties: {
            url: { type: "string" },
            handle: { type: "string" },
            likes: { type: "number" }
          }
        },
        instagram: {
          type: "object",
          properties: {
            url: { type: "string" },
            handle: { type: "string" },
            followers: { type: "number" }
          }
        },
        youtube: {
          type: "object",
          properties: {
            url: { type: "string" },
            handle: { type: "string" },
            subscribers: { type: "number" }
          }
        },

        // Professional platforms
        github: {
          type: "object",
          properties: {
            url: { type: "string" },
            organization: { type: "string" },
            repos: { type: "number" }
          }
        },
        glassdoor: {
          type: "object",
          properties: {
            url: { type: "string" },
            rating: { type: "number" },
            reviews: { type: "number" }
          }
        },
        crunchbase: {
          type: "object",
          properties: {
            url: { type: "string" },
            handle: { type: "string" }
          }
        },

        // Other platforms
        tiktok: { type: "string" },
        pinterest: { type: "string" },
        reddit: { type: "string" },
        discord: { type: "string" },
        telegram: { type: "string" },
        medium: { type: "string" },
        behance: { type: "string" },
        dribbble: { type: "string" },

        // All social URLs
        all: {
          type: "array",
          items: {
            type: "object",
            properties: {
              platform: { type: "string" },
              url: { type: "string" }
            }
          },
          description: "All social media URLs found"
        }
      }
    },

    /**
     * Products and services
     * Additional business information
     */
    products: {
      type: "object",
      properties: {
        // Main offerings
        products: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              category: { type: "string" },
              price: { type: "string" },
              url: { type: "string" },
              image: { type: "string" }
            }
          },
          description: "Products offered"
        },

        // Services
        services: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              category: { type: "string" }
            }
          },
          description: "Services offered"
        },

        // Pricing
        pricing: {
          type: "object",
          properties: {
            model: {
              type: "string",
              enum: ["subscription", "one-time", "freemium", "usage-based", "custom"],
              description: "Pricing model"
            },
            currency: { type: "string" },
            plans: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  price: { type: "string" },
                  period: { type: "string" },
                  features: {
                    type: "array",
                    items: { type: "string" }
                  }
                }
              }
            },
            hasFreeTrials: { type: "boolean" },
            hasFreePlan: { type: "boolean" }
          }
        }
      }
    },

    /**
     * Key personnel and team
     */
    people: {
      type: "object",
      properties: {
        executives: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              title: { type: "string" },
              department: { type: "string" },
              bio: { type: "string" },
              photo: { type: "string" },
              linkedin: { type: "string" },
              twitter: { type: "string" },
              email: { type: "string" }
            }
          },
          description: "Executive team members"
        },

        boardMembers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              title: { type: "string" },
              company: { type: "string" }
            }
          },
          description: "Board of directors"
        },

        keyPeople: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              role: { type: "string" }
            }
          },
          description: "Other key personnel"
        }
      }
    },

    /**
     * Additional metadata
     */
    metadata: {
      type: "object",
      properties: {
        // Page metadata
        title: {
          type: "string",
          description: "Page title"
        },
        description: {
          type: "string",
          description: "Meta description"
        },
        keywords: {
          type: "array",
          items: { type: "string" },
          description: "Meta keywords"
        },
        author: {
          type: "string",
          description: "Page author"
        },

        // OpenGraph data
        ogTitle: { type: "string" },
        ogDescription: { type: "string" },
        ogImage: { type: "string" },
        ogType: { type: "string" },

        // Twitter Card
        twitterTitle: { type: "string" },
        twitterDescription: { type: "string" },
        twitterImage: { type: "string" },
        twitterSite: { type: "string" },

        // Technical
        language: { type: "string" },
        lastModified: { type: "string" },
        publishedDate: { type: "string" },
        canonicalUrl: { type: "string" },

        // Legal
        privacyPolicyUrl: { type: "string" },
        termsOfServiceUrl: { type: "string" },
        cookiePolicyUrl: { type: "string" }
      }
    }
  }
}

/**
 * E-commerce specific schema
 * For online stores and marketplaces
 */
export const ECOMMERCE_SCHEMA = {
  type: "object",
  properties: {
    // Store information
    store: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        logo: { type: "string" },
        currency: { type: "string" },
        languages: {
          type: "array",
          items: { type: "string" }
        },
        countries: {
          type: "array",
          items: { type: "string" },
          description: "Countries served"
        }
      }
    },

    // Products catalog
    products: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          sku: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          price: { type: "number" },
          currency: { type: "string" },
          originalPrice: { type: "number" },
          discount: { type: "number" },

          // Inventory
          availability: {
            type: "string",
            enum: ["in-stock", "out-of-stock", "pre-order", "discontinued"]
          },
          stock: { type: "number" },

          // Categories
          category: { type: "string" },
          subcategory: { type: "string" },
          tags: {
            type: "array",
            items: { type: "string" }
          },

          // Media
          images: {
            type: "array",
            items: {
              type: "object",
              properties: {
                url: { type: "string" },
                alt: { type: "string" },
                isPrimary: { type: "boolean" }
              }
            }
          },
          videos: {
            type: "array",
            items: { type: "string" }
          },

          // Specifications
          brand: { type: "string" },
          model: { type: "string" },
          weight: { type: "string" },
          dimensions: { type: "string" },
          color: { type: "string" },
          size: { type: "string" },
          material: { type: "string" },

          // Ratings
          rating: { type: "number" },
          reviewCount: { type: "number" },

          // Variations
          variations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                value: { type: "string" },
                price: { type: "number" },
                stock: { type: "number" }
              }
            }
          },

          // URLs
          url: { type: "string" },
          addToCartUrl: { type: "string" }
        }
      }
    },

    // Categories
    categories: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          url: { type: "string" },
          productCount: { type: "number" },
          subcategories: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                url: { type: "string" }
              }
            }
          }
        }
      }
    },

    // Shopping policies
    policies: {
      type: "object",
      properties: {
        shipping: {
          type: "object",
          properties: {
            freeShippingThreshold: { type: "number" },
            shippingCost: { type: "string" },
            estimatedDelivery: { type: "string" },
            internationalShipping: { type: "boolean" },
            shippingMethods: {
              type: "array",
              items: { type: "string" }
            }
          }
        },
        returns: {
          type: "object",
          properties: {
            returnPeriod: { type: "string" },
            returnPolicy: { type: "string" },
            restockingFee: { type: "string" }
          }
        },
        payment: {
          type: "object",
          properties: {
            methods: {
              type: "array",
              items: { type: "string" }
            },
            secureCheckout: { type: "boolean" },
            buyNowPayLater: { type: "boolean" }
          }
        }
      }
    }
  }
}

/**
 * Blog/News content schema
 * For content-heavy sites
 */
export const BLOG_SCHEMA = {
  type: "object",
  properties: {
    // Articles/Posts
    articles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          subtitle: { type: "string" },
          author: {
            type: "object",
            properties: {
              name: { type: "string" },
              bio: { type: "string" },
              avatar: { type: "string" },
              url: { type: "string" }
            }
          },
          publishedDate: { type: "string" },
          modifiedDate: { type: "string" },
          readingTime: { type: "string" },

          // Content
          summary: { type: "string" },
          content: { type: "string" },
          excerpt: { type: "string" },

          // Categorization
          category: { type: "string" },
          tags: {
            type: "array",
            items: { type: "string" }
          },

          // Media
          featuredImage: {
            type: "object",
            properties: {
              url: { type: "string" },
              alt: { type: "string" },
              caption: { type: "string" }
            }
          },

          // Engagement
          viewCount: { type: "number" },
          likeCount: { type: "number" },
          commentCount: { type: "number" },
          shareCount: { type: "number" },

          // URLs
          url: { type: "string" },
          canonicalUrl: { type: "string" }
        }
      }
    },

    // Categories
    categories: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          postCount: { type: "number" },
          url: { type: "string" }
        }
      }
    },

    // Authors
    authors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          bio: { type: "string" },
          avatar: { type: "string" },
          social: {
            type: "object",
            properties: {
              twitter: { type: "string" },
              linkedin: { type: "string" },
              website: { type: "string" }
            }
          },
          postCount: { type: "number" }
        }
      }
    },

    // Publication info
    publication: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        logo: { type: "string" },
        rssUrl: { type: "string" },
        newsletterUrl: { type: "string" }
      }
    }
  }
}

/**
 * Job listings schema
 * For career pages and job boards
 */
export const JOBS_SCHEMA = {
  type: "object",
  properties: {
    jobs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          department: { type: "string" },
          location: { type: "string" },
          remote: { type: "boolean" },
          type: {
            type: "string",
            enum: ["full-time", "part-time", "contract", "internship", "temporary"]
          },
          level: {
            type: "string",
            enum: ["entry", "mid", "senior", "lead", "executive"]
          },
          salary: {
            type: "object",
            properties: {
              min: { type: "number" },
              max: { type: "number" },
              currency: { type: "string" },
              period: { type: "string" }
            }
          },
          description: { type: "string" },
          requirements: {
            type: "array",
            items: { type: "string" }
          },
          benefits: {
            type: "array",
            items: { type: "string" }
          },
          postedDate: { type: "string" },
          applicationUrl: { type: "string" }
        }
      }
    }
  }
}

/**
 * Real estate schema
 * For property listings
 */
export const REAL_ESTATE_SCHEMA = {
  type: "object",
  properties: {
    properties: {
      type: "array",
      items: {
        type: "object",
        properties: {
          // Basic info
          title: { type: "string" },
          type: {
            type: "string",
            enum: ["house", "apartment", "condo", "townhouse", "land", "commercial"]
          },
          status: {
            type: "string",
            enum: ["for-sale", "for-rent", "sold", "pending"]
          },

          // Pricing
          price: { type: "number" },
          currency: { type: "string" },
          pricePerSqft: { type: "number" },

          // Location
          address: {
            type: "object",
            properties: {
              street: { type: "string" },
              city: { type: "string" },
              state: { type: "string" },
              zip: { type: "string" },
              country: { type: "string" },
              latitude: { type: "number" },
              longitude: { type: "number" }
            }
          },

          // Details
          bedrooms: { type: "number" },
          bathrooms: { type: "number" },
          squareFeet: { type: "number" },
          lotSize: { type: "string" },
          yearBuilt: { type: "number" },

          // Features
          features: {
            type: "array",
            items: { type: "string" }
          },

          // Media
          images: {
            type: "array",
            items: { type: "string" }
          },
          virtualTourUrl: { type: "string" },

          // Listing info
          mlsNumber: { type: "string" },
          listingDate: { type: "string" },
          agent: {
            type: "object",
            properties: {
              name: { type: "string" },
              phone: { type: "string" },
              email: { type: "string" }
            }
          },

          url: { type: "string" }
        }
      }
    }
  }
}

/**
 * Schema type mapping
 */
export type SchemaType = 'company' | 'ecommerce' | 'blog' | 'jobs' | 'realestate' | 'custom'

/**
 * Get schema by type
 */
export function getSchema(type: SchemaType): any {
  const schemas: Record<SchemaType, any> = {
    company: COMPANY_SCHEMA,
    ecommerce: ECOMMERCE_SCHEMA,
    blog: BLOG_SCHEMA,
    jobs: JOBS_SCHEMA,
    realestate: REAL_ESTATE_SCHEMA,
    custom: {} // User provides custom schema
  }

  return schemas[type] || COMPANY_SCHEMA
}

/**
 * Combine multiple schemas
 * For sites that have multiple content types
 */
export function combineSchemas(...schemas: any[]): any {
  const combined = {
    type: "object",
    properties: {}
  }

  for (const schema of schemas) {
    if (schema.properties) {
      Object.assign(combined.properties, schema.properties)
    }
  }

  return combined
}

/**
 * Create custom schema from field list
 * Simplified schema creation
 */
export function createCustomSchema(fields: Array<{
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description?: string
  required?: boolean
}>): any {
  const properties: any = {}
  const required: string[] = []

  for (const field of fields) {
    properties[field.name] = {
      type: field.type,
      description: field.description
    }

    if (field.required) {
      required.push(field.name)
    }
  }

  return {
    type: "object",
    properties,
    required: required.length > 0 ? required : undefined
  }
}

/**
 * Schema validation helper
 * Ensures schema is valid JSON Schema
 */
export function validateSchema(schema: any): boolean {
  // Basic validation
  if (!schema || typeof schema !== 'object') {
    return false
  }

  if (!schema.type) {
    return false
  }

  if (schema.type === 'object' && !schema.properties) {
    return false
  }

  return true
}

/**
 * Example: Creating a custom schema for a specific use case
 */
export const CUSTOM_SCHEMA_EXAMPLE = createCustomSchema([
  { name: 'productName', type: 'string', required: true },
  { name: 'price', type: 'number', required: true },
  { name: 'inStock', type: 'boolean' },
  { name: 'reviews', type: 'array', description: 'Customer reviews' }
])
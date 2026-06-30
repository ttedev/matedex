import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import AppleStrategy from 'passport-apple';
import { env } from './env';
import * as AuthService from '../services/auth.service';

const BACKEND_URL = `http://localhost:${env.PORT}`;

// ---- Google ----
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${BACKEND_URL}/auth/google/callback`,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('Email non disponible'), undefined);

          const result = await AuthService.findOrCreateOAuthUser({
            provider: 'google',
            providerId: profile.id,
            email,
            displayName: profile.displayName,
            avatarUrl: profile.photos?.[0]?.value,
          });
          return done(null, result);
        } catch (err) {
          return done(err as Error, undefined);
        }
      }
    )
  );
}

// ---- Facebook ----
if (env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: env.FACEBOOK_APP_ID,
        clientSecret: env.FACEBOOK_APP_SECRET,
        callbackURL: `${BACKEND_URL}/auth/facebook/callback`,
        profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('Email non disponible'), undefined);

          const result = await AuthService.findOrCreateOAuthUser({
            provider: 'facebook',
            providerId: profile.id,
            email,
            displayName: `${profile.name?.givenName} ${profile.name?.familyName}`.trim(),
            avatarUrl: profile.photos?.[0]?.value,
          });
          return done(null, result);
        } catch (err) {
          return done(err as Error, undefined);
        }
      }
    )
  );
}

// ---- Apple ----
if (env.APPLE_CLIENT_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY) {
  passport.use(
    new AppleStrategy(
      {
        clientID: env.APPLE_CLIENT_ID,
        teamID: env.APPLE_TEAM_ID,
        keyID: env.APPLE_KEY_ID,
        privateKeyString: env.APPLE_PRIVATE_KEY,
        callbackURL: `${BACKEND_URL}/auth/apple/callback`,
        scope: ['name', 'email'],
      },
      async (_accessToken, _refreshToken, _idToken, profile, done) => {
        try {
          const email = profile.email;
          if (!email) return done(new Error('Email non disponible'), undefined);

          const result = await AuthService.findOrCreateOAuthUser({
            provider: 'apple',
            providerId: profile.id,
            email,
            displayName: profile.name?.firstName ?? 'Utilisateur Apple',
          });
          return done(null, result);
        } catch (err) {
          return done(err as Error, undefined);
        }
      }
    )
  );
}

export default passport;
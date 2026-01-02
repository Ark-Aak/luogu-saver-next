import { Cacheable } from '@/decorators/cacheable';
import { CacheEvict } from '@/decorators/cache-evict';
import { User } from '@/entities/user';

export class UserService {
    /*
     * Get user by ID with caching
     *
     * Result will be cached for 10 minutes
     *
     * @param id User ID
     * @returns User object or null if not found
     */
    @Cacheable(600, id => `user:${id}`, User)
    static async getUserById(id: number): Promise<User | null> {
        return await User.findOne({ where: { id } });
    }

    static async getUserByIdWithoutCache(id: number): Promise<User | null> {
        return await User.findOne({ where: { id } });
    }

    /*
     * Save a user
     *
     * Will evict the cache for this user ID
     *
     * @param user User object to save
     * @returns Saved user object
     */
    @CacheEvict((user: User) => `user:${user.id}`)
    static async saveUser(user: User): Promise<User> {
        return await user.save();
    }
}

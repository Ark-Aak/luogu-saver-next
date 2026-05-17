import { Cacheable } from '@/decorators/cacheable';
import { CacheEvict } from '@/decorators/cache-evict';
import { User } from '@/entities/user';
import { EntityManager } from 'typeorm';

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

    static createUser(data: Partial<User>): User {
        const user = new User();
        Object.assign(user, data);
        return user;
    }

    @CacheEvict((data: Partial<User>) => (data.id === undefined ? [] : `user:${data.id}`))
    static async upsertLuoguUser(data: Partial<User>, manager?: EntityManager): Promise<User> {
        if (data.id === undefined) {
            throw new Error('User ID is required');
        }

        const repository = manager ? manager.getRepository(User) : User.getRepository();
        const user = repository.create(data);
        await repository.upsert(user, ['id']);
        return user;
    }
}

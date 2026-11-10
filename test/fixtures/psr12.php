<?php

declare(strict_types=1);

namespace App\Models;

use App\Contracts\HasName;
use InvalidArgumentException;

/**
 * A well formatted class.
 *
 * @template T
 */
#[Entity(table: 'users')]
final class User extends Model implements HasName
{
    use Timestamps;

    public const STATUS_ACTIVE = 1;

    private ?int $id = null;

    public function __construct(
        private readonly string $name,
        protected array $roles = [],
    ) {
        parent::__construct();
    }

    #[Pure]
    public function name(): string
    {
        return $this->name;
    }

    public function describe(int $level): string
    {
        if ($level > 1 && $this->id !== null) {
            $label = $level === 2 ? 'two' : 'many';
        } elseif ($level === 0) {
            $label = 'zero';
        } else {
            $label = 'one';
        }

        foreach ($this->roles as $key => $role) {
            $label .= $key . ':' . $role;
        }

        try {
            $result = $this->compute($level) ?? -1;
        } catch (InvalidArgumentException | \RuntimeException $e) {
            throw $e;
        } finally {
            $this->id++;
        }

        switch ($level) {
            case 1:
                $label = 'a';
                break;
            default:
                $label = 'b';
        }

        $items = array_map(function ($x) use ($level) {
            return $x * $level;
        }, [1, 2, 3]);

        $chain = $this
            ->filter()
            ->map(fn($x) => $x + 1);

        return match (true) {
            $level > 5 => 'big',
            default => $label,
        };
    }
}

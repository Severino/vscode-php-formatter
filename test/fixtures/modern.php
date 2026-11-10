<?php
namespace Demo;

enum Suit: string
{
    case Hearts = 'H';
    case Spades = 'S';

    public function label(): string
    {
        return match($this){
            self::Hearts=>'Hearts',
            self::Spades=>'Spades',
        };
    }
}

#[Attribute(Attribute::TARGET_CLASS)]
final class Config{
    public function __construct(public readonly array $values=[]){}

    public function get(string $key,mixed $default=null):mixed{
        return $this->values[$key]??$default;
    }
}

$text = <<<EOT
    Heredoc   with   odd    spacing {$config->get('a')}
      and a trailing space   
    EOT;
$raw = <<<'RAW'
  $not   {interpolated}   
RAW;
$sql = "SELECT  *   FROM  t   WHERE a = '{$a['x']}'  AND b = \"q\"";
$single = 'it\'s   (int)   $x   {';
$back = `ls   -la`;

function &refReturn(array &$a){return $a;}
$closure = static function(int ...$nums):int{return array_sum($nums);};
$obj?->method(named:1,other:2);
$v = $a?->b?->c;
echo (string)$v,(bool)$w;
$i = (int)  $s;
list($a,$b)=[1,2];
[$c,$d]=[3,4];
$big = 1_000_000+0x1F-0b11*1.5e-3/.5;
goto end;
end:
echo PHP_EOL;
// formatter:off is not a directive; the next one is
// @formatter:off
$matrix = [
    1,0,0,
    0,1,0,
];
// @formatter:on
$after=[1,2,3];
# hash comment
/* block */ $z=1; /* another
   multi-line */
if ($a) echo 'one';
else echo 'two';
while ($x)
    $x--;

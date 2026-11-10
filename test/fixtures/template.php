<!DOCTYPE html>
<html>
<head><title><?= $title ?></title></head>
<body>
<?php if ($user):   ?>
  <p>Hello, <?= htmlspecialchars($user->name) ?>!</p>
<?php else: ?>
  <p>Please log in.</p>
<?php endif; ?>
<ul>
<?php foreach($items as $item){ ?>
    <li class="<?= $item['class'] ?>"><?= $item['label'] ?></li>
<?php } ?>
</ul>
<?php
   $x   =  1;   // trailing comment   
   if($x){echo "yes";}
?>
<script>
  if (a) { b(); }   
</script>
<?php echo 'last' ?>
trailing html   
